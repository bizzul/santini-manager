import { Session } from "@auth0/nextjs-auth0";

const rolesClaim = `${process.env.AUTH0_AUDIENCE}/roles`;

export class Auth0Controls {
  static hasRole = async (
    session: Session | null | undefined,
    role: string
  ) => {
    // console.log(rolesClaim)
    if (session && session.user) {
      if (session.user[rolesClaim]) {
        if (session.user[rolesClaim].includes(role)) {
          return true;
        }
      }
    }
    return false;
  };
}
