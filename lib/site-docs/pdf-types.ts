export interface MSADocumentProps {
  documentType: string
  documentNo: string
  date: string
  revision: string
  title: string
  subtitle?: string
  project: string
  client: string
  preparedBy: string
  companyName: string
  companyLogoUrl?: string | null
  sections: MSASection[]
}

export interface MSASection {
  title: string
  items: MSAItem[]
}

export type MSAItem =
  | { type: 'paragraph'; text: string }
  | { type: 'fields'; data: { label: string; value: string }[] }
  | { type: 'table'; columns: { header: string; weight: number }[]; rows: string[][] }
  | {
      type: 'signoff_table'
      columns: { header: string; weight: number }[]
      rows: { name: string; organization: string; signatureDate: string; signatureData?: string | null; signUrl?: string | null; status: string }[]
    }
  | {
      type: 'status_table'
      columns: { header: string; weight: number }[]
      rows: { cells: string[]; status: 'open' | 'closed' | 'critical' | 'in-progress' | 'council-response-provided' }[]
    }
  | { type: 'outcome'; text: string }
  | { type: 'action'; text: string }
  | { type: 'warning'; text: string }
