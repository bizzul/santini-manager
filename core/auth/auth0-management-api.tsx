export class Auth0ManagementApi {
  /**
   * Gets an Auth0 Management API OAuth token
   * Generates a new token if the current one has expired
   * @param session - The session object containing the access token
   * @returns The management token
   */
  static async manageToken(session: any) {
    const now = new Date().getTime() / 1000;
    const managementToken = session.managementToken;
    const managementTokenExpiresAt = session.managementTokenExpiresAt;

    if (!managementToken || managementTokenExpiresAt < now) {
      const response = await fetch(
        `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
            client_id: process.env.AUTH0_USER_MANAGEMENT_M2M_CLIENT_ID,
            client_secret: process.env.AUTH0_USER_MANAGEMENT_M2M_CLIENT_SECRET,
            audience: `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
          }),
        }
      );

      const data = await response.json();
      session.managementToken = data.access_token;
      session.managementTokenExpiresAt = now + data.expires_in;
    }

    return session.managementToken;
  }
}
