declare module "mjml-browser" {
  interface MjmlResult {
    html: string;
    errors: unknown[];
  }
  export default function mjml2html(mjml: string, options?: Record<string, unknown>): MjmlResult;
}
