import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export interface ProposalPdfOption {
  caption: string;
}

export interface ProposalPdfData {
  brandName: string;
  title: string;
  projectName: string;
  clientName: string | null;
  intro: string | null;
  terms: string | null;
  currency: string;
  estimateVersion: number;
  lines: { label: string; quantity: number; totalMinor: number }[];
  subtotalMinor: number;
  markupMinor: number;
  taxMinor: number;
  totalMinor: number;
  options: ProposalPdfOption[];
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  brand: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, marginTop: 6, marginBottom: 4 },
  muted: { color: "#6b7280" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
  cellLabel: { flex: 1 },
  cellQty: { width: 60, textAlign: "right" },
  cellTotal: { width: 90, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingTop: 6, fontWeight: "bold" },
  option: { marginBottom: 4 },
  footer: { marginTop: 24, fontSize: 8, color: "#6b7280" },
});

function money(minor: number, currency: string): string {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

export async function renderProposalPdf(data: ProposalPdfData): Promise<Buffer> {
  const doc = (
    <Document title={data.title} author={data.brandName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>{data.brandName}</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.muted}>
          {data.projectName}
          {data.clientName !== null ? ` · ${data.clientName}` : ""}
        </Text>

        {data.intro !== null && (
          <View style={styles.section}>
            <Text>{data.intro}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          {data.options.map((option, index) => (
            <Text key={`${option.caption}-${String(index)}`} style={styles.option}>
              {String(index + 1)}. {option.caption !== "" ? option.caption : "Concept option"}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimate (v{data.estimateVersion})</Text>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Item</Text>
            <Text style={styles.cellQty}>Qty</Text>
            <Text style={styles.cellTotal}>Total</Text>
          </View>
          {data.lines.map((line, index) => (
            <View key={`${line.label}-${String(index)}`} style={styles.row}>
              <Text style={styles.cellLabel}>{line.label}</Text>
              <Text style={styles.cellQty}>{line.quantity.toFixed(2)}</Text>
              <Text style={styles.cellTotal}>{money(line.totalMinor, data.currency)}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Subtotal</Text>
            <Text style={styles.cellQty} />
            <Text style={styles.cellTotal}>{money(data.subtotalMinor, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Markup</Text>
            <Text style={styles.cellQty} />
            <Text style={styles.cellTotal}>{money(data.markupMinor, data.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Tax</Text>
            <Text style={styles.cellQty} />
            <Text style={styles.cellTotal}>{money(data.taxMinor, data.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.cellLabel}>Total</Text>
            <Text style={styles.cellQty} />
            <Text style={styles.cellTotal}>{money(data.totalMinor, data.currency)}</Text>
          </View>
        </View>

        {data.terms !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={styles.muted}>{data.terms}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Renders are concept visuals and not to scale. Estimate is based on provided measurements
          and the rates shown.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
