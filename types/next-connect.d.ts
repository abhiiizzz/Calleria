declare module "next-connect" {
  import { NextApiRequest, NextApiResponse } from "next";

  interface NextConnect<Req = NextApiRequest, Res = NextApiResponse> {
    use: (
      ...handlers: Array<(req: Req, res: Res, next: () => void) => any>
    ) => NextConnect<Req, Res>;
    get: (
      ...handlers: Array<(req: Req, res: Res) => any>
    ) => NextConnect<Req, Res>;
    post: (
      ...handlers: Array<(req: Req, res: Res) => any>
    ) => NextConnect<Req, Res>;
    // You may add additional method signatures as needed.
  }

  function nextConnect<
    Req = NextApiRequest,
    Res = NextApiResponse
  >(): NextConnect<Req, Res>;

  export default nextConnect;
}
