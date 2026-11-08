import { Document, Page, StyleSheet, Text, View, Image, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

export interface ProposalPdfOption {
  caption: string;
  image?: Buffer;
  beforeImage?: Buffer;
}

export interface ProposalPdfData {
  brandName: string;
  brandColor?: string;
  logo?: Buffer;
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
  page: {
    padding: 40,
    paddingBottom: 58,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#142124",
    backgroundColor: "#faf8f5",
  },
  brand: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, marginTop: 6, marginBottom: 4 },
  muted: { color: "#6b7280" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, marginBottom: 6 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
  },
  cellLabel: { flex: 1 },
  cellQty: { width: 60, textAlign: "right" },
  cellTotal: { width: 90, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingTop: 6, fontWeight: "bold" },
  option: { marginBottom: 4 },
  footer: { marginTop: 24, fontSize: 8, color: "#6b7280" },
  logo: { width: 100, height: 44, objectFit: "contain", marginBottom: 12 },
  image: { width: "100%", height: 260, objectFit: "contain", marginVertical: 10 },
  comparison: { flexDirection: "row", gap: 12, marginTop: 10 },
  half: { width: "48%" },
  beforeImage: { width: "100%", height: 150, objectFit: "contain" },
  pageNumber: { position: "absolute", bottom: 24, right: 40, fontSize: 8, color: "#526366" },
});

function money(minor: number, currency: string): string {
  return `${currency} ${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

export async function renderProposalPdf(data: ProposalPdfData): Promise<Buffer> {
  const doc: React.ReactElement<React.ComponentProps<typeof Document>> = (
    <Document title={data.title} author={data.brandName}>
      <Page size="A4" style={styles.page}>
        {data.logo !== undefined && <Image src={data.logo} style={styles.logo} />}
        <Text style={styles.brand}>{data.brandName}</Text>
        <Text style={[styles.title, { color: data.brandColor ?? "#b95308" }]}>{data.title}</Text>
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
          <Text style={styles.sectionTitle}>Concept options</Text>
          {data.options.map((option, index) => (
            <Text key={index} style={styles.option}>
              Option {index + 1}: {option.caption || "Concept visual"}
            </Text>
          ))}
          <Text style={styles.muted}>Concept visuals follow the estimate and terms.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimate (v{data.estimateVersion})</Text>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Item</Text>
            <Text style={styles.cellQty}>Qty</Text>
            <Text style={styles.cellTotal}>Total</Text>
          </View>
          {data.lines.map((line, index) => (
            <View key={`${line.label}-${String(index)}`} style={styles.row} wrap={false}>
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
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
      {data.options.map((option, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <Text style={styles.brand}>{data.brandName}</Text>
          <Text style={[styles.title, { color: data.brandColor ?? "#b95308" }]}>
            Option {index + 1}
          </Text>
          <Text>{option.caption || "Concept visual"}</Text>
          {option.image !== undefined && <Image src={option.image} style={styles.image} />}
          {option.beforeImage !== undefined && option.image !== undefined && (
            <View style={styles.comparison}>
              <View style={styles.half}>
                <Text style={styles.muted}>Before</Text>
                <Image src={option.beforeImage} style={styles.beforeImage} />
              </View>
              <View style={styles.half}>
                <Text style={styles.muted}>After - concept visual</Text>
                <Image src={option.image} style={styles.beforeImage} />
              </View>
            </View>
          )}
          <Text style={styles.footer}>
            AI-generated concept visual. Not to scale. Dimensions and prices are based on supplied
            measurements and studio rates.
          </Text>
          <Text
            fixed
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </Page>
      ))}
    </Document>
  );

  return renderToBuffer(doc);
}
