# Melo: connect Google login

The local implementation is in `E:\from_desktop\Gamified-Timer-1`. It is not connected to an online Firebase project yet. Guest mode continues to work.

## One-time Firebase setup

1. Open [Firebase Console](https://console.firebase.google.com/) with your Google account. Create a project, or select your existing Melo project. Google Analytics is optional and is not used by this implementation.
2. In **Build → Authentication → Get started → Sign-in method**, enable **Google**, choose your support email, and save.
3. In **Build → Firestore Database**, create the **default database**, using **production mode**. Choose a location appropriate for your users.
4. In Firestore's **Rules** tab, replace the rules with the contents of `firestore.rules` from the Melo folder, and publish them. These rules allow each signed-in user to access only their own progress; they deny public access and collection listing.
5. In **Project settings → General → Your apps**, register a **Web app**. Copy its `firebaseConfig` object into `firebase-config.js`, replacing `null`:

   ```js
   window.MELO_FIREBASE_CONFIG = {
       // The web configuration supplied by Firebase goes here.
   };
   ```

   Use the public **Web app configuration**, never an Admin SDK/service-account private key. No Google password belongs in any project file.

6. In **Authentication → Settings → Authorized domains**, add the actual website hostname and `localhost` for local development. For a GitHub Pages URL, authorize the hostname, such as `shira-yuki23.github.io`, without its path. Authorize `127.0.0.1` too if using that local address.
7. Serve the website over HTTP locally or HTTPS online. Double-clicking `index.html` (`file://`) supports Guest mode but not Google sign-in. Upload the new `google-account.js` and `firebase-config.js` along with the updated HTML, CSS, script, icons, and audio when publishing the website.

## Verify after connecting

- Click **Continue with Google**, select your account, and verify the account name appears.
- Add a task and wait for **Saved to your Google account**.
- Open Melo on another device, sign in with the same Google account, and confirm the task appears.
- Sign out: the browser's Guest progress should reappear. Sign into another Google account: the first account's progress must not appear.
- Edit on two devices before syncing. The app should ask which copy to keep instead of silently overwriting progress.
- Disconnect briefly, change a task, reconnect, and use **Retry sync** if needed.

## Behavior

- Syncs tasks, break-bank minutes, session count, and focus/break duration settings.
- Refreshes cloud progress every 15 seconds and when returning to a visible tab. Changes save after a short debounce.
- Each device runs its own active countdown. Syncing progress does not remotely start, pause, or restart the other device's running timer.
- First login offers to import Guest progress only when the Google account has no saved progress.
- Login lasts for the browser tab's session. Unsynced drafts remain in that tab for the corresponding account; the app warns before closing a tab with unsynced changes.
- The app uses Firebase's Google sign-in and Firestore APIs. No custom username/PIN backend is installed.

## Validation completed locally

Timer transition regression checks, simulated account isolation, first-login import, offline retries, conflicting saves, failed-load protection, JavaScript syntax, and the unconfigured Guest interface were checked. Real Google sign-in, deployed Firestore rules, and real cross-device sync still require the project connection above.

References: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore access rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).
