// Stub for the UNPUBLISHED @univerjs/docs-mention-ui (0.25.x): Casual Sheets
// lazy-imports it in its threadComment plugin group. A bare empty module made
// the loader register undefined and the whole comments group fail. Export
// no-op plugins Univer accepts instead (no @-mention autocomplete).
import { Plugin, UniverInstanceType } from "@univerjs/core";
class NoopMentionPlugin extends Plugin {
  static pluginName = "UNIVER_DOCS_MENTION_UI_PLUGIN_STUB";
  static type = UniverInstanceType.UNIVER_DOC;
  constructor(_config, _injector) { super(); }
}
export class UniverDocsMentionUIPlugin extends NoopMentionPlugin { static pluginName = "UNIVERDOCSMENTIONUIPLUGIN_STUB"; }
export default UniverDocsMentionUIPlugin;
