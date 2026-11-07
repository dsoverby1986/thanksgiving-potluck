# Thanksgiving menu

A one-page signup for a family meal. People add what they are bringing, and the page lists every dish.

GitHub Pages hosts the page. [Supabase](https://supabase.com) stores the dishes. The free Supabase project is enough for a family list.

## Connect the menu

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the SQL Editor, paste `supabase/schema.sql`, and run it.
3. Open **Connect**, or **Project Settings → API Keys**. Copy the project URL and the **publishable** key (`sb_publishable_...`). An older anon key also works.
4. Paste both into `config.js`. Leave the secret key where it is. A secret key in this file would give every visitor full access to the database.
5. Change the title, date, and note in `config.js` if you want different wording.

`config.js` is meant to be committed. The publishable key is public by design. The family password is not. Row policies are what keep visitors from reading or adding dishes until they sign in.

## Add a family password

1. In Supabase, open **Authentication → Users → Add user**. Enter an email and the password you will share with the family. Turn on **Auto Confirm**.
2. Open **Authentication → Sign In / Providers → Email** and turn off new sign-ups, so strangers cannot register their own user.
3. Put that email in `familyEmail` in `config.js`. Leave the password out of the file.
4. If you already ran `supabase/schema.sql` while the menu was open to everyone, run `supabase/enable-auth.sql` in the SQL Editor.

The page asks for the password and remembers it on that device until someone chooses **Sign out**. Signing in uses one shared user. It does not keep a separate account for each person.

## Publish on GitHub Pages

1. Create a public repository and push this folder. A public repo lets guests open the page without a GitHub account.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose the default branch and the `/ (root)` folder, then save.

The address will look like `https://<user>.github.io/<repository>/`. The first deploy can take a minute. Anyone with the link sees the sign-in screen. The menu itself opens after the family password. The page asks search engines not to index it.

## Preview on your computer

From this folder:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080`. Opening `index.html` as a file can block the request to Supabase.

## Keep it available

A free Supabase project can pause after about a week with no database activity. Supabase emails you before that happens. Opening the project in the dashboard, or loading this page, counts as activity. If the menu ever fails to load around the meal, open the project and choose **Resume project**. The dishes are still there.

A signed-in family member can edit or remove any dish on the page. Run `supabase/allow-edit.sql` once in the SQL Editor so those actions are allowed. The page refreshes on its own every 20 seconds.
