import { Injectable } from '@nestjs/common';
import { KalnosticsHttpService } from '../kalnostics-http.service';

/**
 * The render context passed to the kalnostics PDF engine (mirrors its
 * `GeneratePdfDto`): flat `{tag}` values in `variables`, repeating
 * `{{#each key}}` row-sets in `sections`, and `{{image:id}}` sources in
 * `images`.
 */
export interface PdfRenderContext {
  variables?: Record<string, unknown>;
  sections?: Record<string, Array<Record<string, unknown>>>;
  images?: Record<string, string>;
}

/**
 * Typed client for kalnostics-new's PDF print-template engine. Renders a
 * document BY TYPE: kalnostics resolves whichever template the tenant mapped to
 * that type on the Configuration screen (falling back to the first active
 * template of the type) and streams back the rendered PDF. The inventory app
 * uses this for the sales invoice (`inventory_invoice`), reusing the same engine
 * that renders kalnostics' own lab reports/bills.
 */
@Injectable()
export class KalnosticsPrintTemplateClient {
  constructor(private readonly http: KalnosticsHttpService) {}

  /**
   * Render the template mapped to `type` with `context`, returning the raw PDF
   * bytes. The caller's bearer token (tenant + active branch) is forwarded, so
   * kalnostics resolves the branch-scoped Configuration default.
   * @param type a kalnostics `PDF_REPORT_TEMPLATE_TYPES` key (e.g. `inventory_invoice`)
   * @param context the render context (variables + sections + images)
   * @throws UpstreamException if no template is configured (404) or rendering fails
   */
  async renderByType(type: string, context: PdfRenderContext): Promise<Buffer> {
    return this.http.postBinary(
      `/pdf-report-templates/render-by-type/${type}`,
      context,
    );
  }
}
