export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-sm text-gray-800">
      <h1 className="text-xl font-semibold text-gray-900">Privacy Policy</h1>
      <p className="text-xs text-gray-500">Last updated September 20, 2026</p>

      <p>
        This app is operated by Emmanuel Church for members of the
        congregation. This page explains what information the app collects
        and how it is used.
      </p>

      <h2 className="text-base font-semibold text-gray-900">
        Information we collect
      </h2>
      <p>
        When you create an account, we collect your name and email address
        through our sign-in provider (Clerk), including via Google sign-in if
        you choose that option. We also store the information you enter in
        the app yourself, such as volunteer signups and, when available,
        feast or event signups.
      </p>

      <h2 className="text-base font-semibold text-gray-900">
        How we use this information
      </h2>
      <p>
        We use this information solely to operate the app: to identify your
        account, to display and manage your volunteer signups, to let church
        administrators approve accounts and coordinate schedules, and to send
        you email reminders about slots you've signed up for or updates about
        your account request. We do not use your information for
        advertising, and we do not sell or share it with third parties for
        marketing purposes.
      </p>

      <h2 className="text-base font-semibold text-gray-900">
        Who has access
      </h2>
      <p>
        Church administrators can see account and signup information in order
        to manage the app. We also use a small number of service providers to
        run the app, who process data on our behalf and don't use it for
        their own purposes: Clerk (sign-in), Convex (data storage), Resend
        (email delivery), and Cloudflare (hosting).
      </p>

      <h2 className="text-base font-semibold text-gray-900">
        Data retention and removal
      </h2>
      <p>
        Your information is kept as long as your account is active. If you'd
        like your account and associated data removed, contact a church
        administrator.
      </p>

      <h2 className="text-base font-semibold text-gray-900">Contact</h2>
      <p>
        Questions about this policy or your data can be directed to a church
        administrator.
      </p>
    </div>
  );
}
