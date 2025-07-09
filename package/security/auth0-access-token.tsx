import { readFileSync } from "fs";
import { NextApiRequest } from "next";
var jwt = require("jsonwebtoken");

type verifyOptions = {
  roles?: string[];
};

export class Auth0AccessToken {
  static verify = (req: NextApiRequest, options?: verifyOptions) => {
    const audience = process.env.AUTH0_AUDIENCE;
    const cert = readFileSync("cert.pem"); // get public key
    //@ts-ignore
    if (req.headers.authorization) {
      return jwt.verify(
        req.headers.authorization.replace("Bearer ", ""),
        cert,
        { algorithms: ["RS256"], complete: true },
        function (err: any, decoded: any) {
          if (err) {
            // console.log("TOKEN IS INVALID");
            return false;
          } else {
            if (options) {
              if (options.roles && options.roles.length > 0) {
                //@ts-ignore

                return decoded.payload[`${audience}/roles`].some(
                  //@ts-ignore
                  (r: any) => options.roles.indexOf(r) >= 0
                );
              }
            }

            return true;
          }
        }
      );
    }
  };
}
