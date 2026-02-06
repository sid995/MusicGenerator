export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-muted-foreground text-sm">
        MusicGenerator is provided as-is, without guarantees. You are
        responsible for how you use generated content. Do not use the service
        for illegal, hateful, or infringing content.
      </p>
      <p className="text-muted-foreground text-sm">
        Commercial usage of generated audio is allowed subject to the licenses
        of the underlying models and any third-party content you provide.
      </p>
    </div>
  );
}

