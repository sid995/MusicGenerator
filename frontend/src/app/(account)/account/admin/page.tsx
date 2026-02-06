import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import {
  incrementUserCredits,
  listUsersWithCredits,
  setUserCredits,
} from "~/actions/admin";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  // `requireAdmin` in the actions will redirect non-admins
  const users = await listUsersWithCredits();

  async function updateCredits(formData: FormData) {
    "use server";

    const userId = formData.get("userId") as string;
    const credits = Number(formData.get("credits"));

    if (!userId || Number.isNaN(credits)) {
      return;
    }

    await setUserCredits(userId, credits);
  }

  async function giveBonus(formData: FormData) {
    "use server";

    const userId = formData.get("userId") as string;
    const amount = Number(formData.get("amount"));

    if (!userId || Number.isNaN(amount) || amount === 0) {
      return;
    }

    await incrementUserCredits(userId, amount);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin – Credits</h1>
      <p className="text-muted-foreground text-sm">
        View users and adjust their credit balances for support.
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Credits</th>
              <th className="px-3 py-2 font-medium">Set credits</th>
              <th className="px-3 py-2 font-medium">Give bonus</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-3 py-2">{user.name}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">{user.credits}</td>
                <td className="px-3 py-2">
                  <form action={updateCredits} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <Input
                      type="number"
                      name="credits"
                      className="h-8 w-24"
                      defaultValue={user.credits}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Save
                    </Button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <form action={giveBonus} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <Input
                      type="number"
                      name="amount"
                      className="h-8 w-24"
                      placeholder="+10"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Add
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

