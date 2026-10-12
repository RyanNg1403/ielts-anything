// One-off repair: strip paragraph letters typed into stored passages.
import { db } from "../src/db.ts";
import { stripParagraphLabels } from "@ielts/spec";
for (const row of db.prepare("select id, spec from tests where kind = 'reading'").all() as { id: string; spec: string }[]) {
  const spec = JSON.parse(row.spec);
  const before = JSON.stringify(spec.passages);
  spec.passages = spec.passages.map(stripParagraphLabels);
  if (JSON.stringify(spec.passages) !== before) {
    db.prepare("update tests set spec = ? where id = ?").run(JSON.stringify(spec), row.id);
    console.log("fixed", row.id);
  }
}
