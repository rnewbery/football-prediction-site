import Link from "next/link";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator access</p>
          <h1>Admin login</h1>
          <p className="intro">
            Sign in to manage competitions, fixtures and results.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      <section className="card login-card">
        <form action={login}>
          <div className="login-fields">
            <div>
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password">Password</label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {params.error && (
            <p className="form-message error-message">
              {params.error}
            </p>
          )}

          <div className="form-actions">
            <button type="submit">Sign in</button>
          </div>
        </form>
      </section>
    </main>
  );
}