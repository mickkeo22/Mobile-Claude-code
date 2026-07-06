# Internal build notes — rendering notes

The internal document is rendered from the same structured output as the client
report (see `prompts/report_client.md`, "Internal build fields"). This file
documents what the renderer adds on top, so you can tune it:

- **Pricing anchors** come from `pricing.yaml` per effort tier — they are
  injected by code, not by the model, so edit the YAML to change quotes.
- **Red flags** from the model are listed at the top of the document.
- **Notable items** captured live during the call are appended verbatim as
  "gold nuggets" for reference.

If you want the model to change how it fills the internal fields
(implementation_path, components, build hours, maintenance, dependencies),
edit the "Internal build fields" section of `prompts/report_client.md` —
both documents come from that single generation call so the client report and
build notes can never disagree about what is being recommended.
