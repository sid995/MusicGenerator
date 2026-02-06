import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "~/env";
import { db } from "~/server/db";
import { Polar } from "@polar-sh/sdk";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: "sandbox",
});

type PolarProductCreditsConfig = {
  productId: string;
  slug: "small" | "medium" | "large";
  credits: number;
};

const POLAR_PRODUCTS: PolarProductCreditsConfig[] = [
  {
    productId: "52b0c17c-2c43-41b8-a178-fc2dae0253da",
    slug: "small",
    credits: 10,
  },
  {
    productId: "8f66e764-90b3-4c84-981e-40ca072f071b",
    slug: "medium",
    credits: 25,
  },
  {
    productId: "7b38a95e-1df5-4f9d-ad48-4a7b83a6c72f",
    slug: "large",
    credits: 50,
  },
];

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: POLAR_PRODUCTS.map((product) => ({
            productId: product.productId,
            slug: product.slug,
          })),
          successUrl: "/",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId ?? null;

            if (!externalCustomerId) {
              console.error("No external customer ID found on Polar webhook.");
              throw new Error("No external customer id found.");
            }

            const productId = order.data.productId;
            const productConfig = POLAR_PRODUCTS.find(
              (product) => product.productId === productId,
            );

            if (!productConfig) {
              console.error("Unhandled Polar product in webhook.", {
                productId,
              });
              return;
            }

            // Use a generic idempotency key; fall back to a synthetic value if needed.
            const eventId = `order-${productId}-${externalCustomerId ?? "unknown"}`;

            try {
              await db.$transaction(async (tx) => {
                const existingEvent = await tx.polarOrderEvent.findUnique({
                  where: { id: eventId },
                });

                if (existingEvent) {
                  // Idempotent: we've already processed this webhook
                  return;
                }

                await tx.polarOrderEvent.create({
                  data: {
                    id: eventId,
                  },
                });

                await tx.user.update({
                  where: { id: externalCustomerId },
                  data: {
                    credits: {
                      increment: productConfig.credits,
                    },
                  },
                });
              });
            } catch (error) {
              console.error(
                "Error handling Polar onOrderPaid webhook.",
                JSON.stringify({
                  eventId,
                  productId,
                  externalCustomerId,
                }),
              );
              throw error;
            }
          },
        }),
      ],
    }),
  ],
});
