import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { MSAItem, MSADocumentProps, MSASection } from '@/lib/site-docs/pdf-types'

const MM_TO_PT = 2.835
const CONTENT_WIDTH = 170 * MM_TO_PT
const FOOTER_RESERVED = 24 * MM_TO_PT
const HEADER_CONTENT_OFFSET = 115

const ORANGE = '#E87722'
const DARK = '#1A1A2E'
const MID = '#4A4A6A'
const LIGHT = '#F5F5F5'
const MLIGHT = '#ECECEC'
const WHITE = '#FFFFFF'
const AMBER = '#D68910'
const AMBERBG = '#FEF9E7'
const GREEN = '#1E8449'
const GREENBG = '#EAFAF1'
const RED = '#C0392B'
const REDBG = '#FDEDEC'
const BLUE = '#1A5276'
const BLUEBG = '#EBF5FB'

const TITLE_STYLE = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 18,
  color: DARK,
}

const SUBTITLE_STYLE = {
  fontFamily: 'Helvetica',
  fontSize: 11,
  color: MID,
}

const SECTION_HEADER = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 10,
  color: WHITE,
  backgroundColor: DARK,
  paddingVertical: 4,
  paddingHorizontal: 8,
  width: CONTENT_WIDTH,
}

const ITEM_HEADER = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 9,
  color: DARK,
  backgroundColor: MLIGHT,
  paddingVertical: 3,
  paddingHorizontal: 6,
}

const BODY_TEXT = {
  fontFamily: 'Helvetica',
  fontSize: 9,
  color: '#222222',
  lineHeight: 1.4,
}

const LABEL_TEXT = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 8,
  color: MID,
}

const VALUE_TEXT = {
  fontFamily: 'Helvetica',
  fontSize: 9,
  color: DARK,
}

const FOOTER_TEXT = {
  fontFamily: 'Helvetica',
  fontSize: 7,
  color: MID,
}

const TABLE_HEADER = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 8,
  color: WHITE,
  backgroundColor: DARK,
  paddingVertical: 3,
  paddingHorizontal: 6,
  textAlign: 'center' as const,
}

const TABLE_CELL = {
  fontFamily: 'Helvetica',
  fontSize: 8,
  color: DARK,
  paddingVertical: 3,
  paddingHorizontal: 6,
  backgroundColor: WHITE,
}

const TABLE_CELL_ALT = {
  ...TABLE_CELL,
  backgroundColor: LIGHT,
}

const STATUS_OPEN = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 8,
  color: AMBER,
  backgroundColor: AMBERBG,
  paddingVertical: 2,
  paddingHorizontal: 6,
  borderRadius: 3,
}

const STATUS_CLOSED = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 8,
  color: GREEN,
  backgroundColor: GREENBG,
  paddingVertical: 2,
  paddingHorizontal: 6,
  borderRadius: 3,
}

const STATUS_CRITICAL = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 8,
  color: RED,
  backgroundColor: REDBG,
  paddingVertical: 2,
  paddingHorizontal: 6,
  borderRadius: 3,
}

const STATUS_IN_PROGRESS = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 8,
  color: BLUE,
  backgroundColor: BLUEBG,
  paddingVertical: 2,
  paddingHorizontal: 6,
  borderRadius: 3,
}



const OUTCOME_BLOCK = {
  backgroundColor: BLUEBG,
  borderWidth: 1,
  borderColor: BLUE,
  padding: 8,
}

const ACTION_BLOCK = {
  backgroundColor: GREENBG,
  borderWidth: 1,
  borderColor: GREEN,
  padding: 8,
}

const WARNING_BLOCK = {
  backgroundColor: AMBERBG,
  borderWidth: 1,
  borderColor: AMBER,
  padding: 8,
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    paddingLeft: 20 * MM_TO_PT,
    paddingRight: 20 * MM_TO_PT,
    paddingTop: 18 * MM_TO_PT,
    paddingBottom: FOOTER_RESERVED,
  },
  content: {
    width: CONTENT_WIDTH,
    paddingTop: HEADER_CONTENT_OFFSET,
    paddingBottom: 6,
  },
  header: {
    position: 'absolute',
    top: 18 * MM_TO_PT,
    left: 20 * MM_TO_PT,
    width: CONTENT_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
  },
  companyBlock: {
    flex: 1,
    paddingRight: 8,
  },
  companyName: {
    ...TITLE_STYLE,
    fontSize: 16,
  },
  logoBox: {
    width: 40 * MM_TO_PT,
    height: 16 * MM_TO_PT,
    borderWidth: 1,
    borderColor: '#D9DDE4',
    backgroundColor: WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  logoText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: MID,
  },
  hr: {
    height: 2,
    backgroundColor: ORANGE,
    marginTop: 8,
    marginBottom: 6,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCell: {
    flex: 1,
    minWidth: 0,
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: MID,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  titleBlock: {
    marginBottom: 8,
  },
  titleBanner: {
    backgroundColor: DARK,
    padding: 10,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: WHITE,
    marginBottom: 2,
  },
  titleSubtitle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: ORANGE,
  },
  titleMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  titleMetaCell: {
    width: '50%',
    borderWidth: 0.5,
    borderColor: MID,
    backgroundColor: LIGHT,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sectionBanner: {
    ...SECTION_HEADER,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginTop: 8,
  },
  paragraph: {
    ...BODY_TEXT,
    marginBottom: 6,
  },
  fieldsGrid: {
    borderWidth: 0.5,
    borderColor: MID,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: MID,
  },
  fieldCol: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: MID,
  },
  table: {
    borderWidth: 1,
    borderColor: DARK,
    marginBottom: 8,
  },
  tableWrap: {
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  headerCell: {
    ...TABLE_HEADER,
    minWidth: 0,
    borderRightWidth: 0.5,
    borderRightColor: '#CCCCCC',
  },
  bodyCell: {
    ...TABLE_CELL,
    minWidth: 0,
    borderTopWidth: 0.5,
    borderTopColor: '#CCCCCC',
    borderRightWidth: 0.5,
    borderRightColor: '#CCCCCC',
  },
  bodyCellAlt: {
    ...TABLE_CELL_ALT,
    borderTopWidth: 0.5,
    borderTopColor: '#CCCCCC',
    borderRightWidth: 0.5,
    borderRightColor: '#CCCCCC',
  },
  cellText: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: DARK,
    lineHeight: 1.35,
  },
  statusWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOpen: STATUS_OPEN,
  statusClosed: STATUS_CLOSED,
  statusCritical: STATUS_CRITICAL,
  statusInProgress: STATUS_IN_PROGRESS,
  block: {
    marginBottom: 8,
  },
  outcomeBlock: OUTCOME_BLOCK,
  actionBlock: ACTION_BLOCK,
  warningBlock: WARNING_BLOCK,
  blockLabel: {
    ...ITEM_HEADER,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 0,
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 8 * MM_TO_PT,
    left: 20 * MM_TO_PT,
    width: CONTENT_WIDTH,
    minHeight: 18 * MM_TO_PT,
    backgroundColor: WHITE,
    paddingTop: 4,
  },
  footerRule: {
    height: 0.5,
    backgroundColor: MID,
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  footerCell: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  footerCenter: {
    textAlign: 'center',
  },
  footerRight: {
    textAlign: 'right',
  },
  footerBrand: {
    fontSize: 6,
    color: '#94A3B8',
  },
  signImageWrap: {
    minHeight: 30,
    justifyContent: 'center',
  },
  signImage: {
    width: 72,
    height: 24,
    objectFit: 'contain',
  },
  signPlaceholder: {
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
  },
})

function truncateTitle(title: string, maxLength = 40): string {
  return title.length > maxLength ? `${title.slice(0, maxLength - 1)}…` : title
}

function SectionBanner({ title }: { title: string }) {
  return <Text style={styles.sectionBanner}>{title.toUpperCase()}</Text>
}

function rowColor(index: number): string {
  return index % 2 === 0 ? WHITE : LIGHT
}

function formatStatus(status: 'open' | 'closed' | 'critical' | 'in-progress'): string {
  if (status === 'in-progress') return 'IN PROGRESS'
  return status.toUpperCase()
}

function statusStyle(status: 'open' | 'closed' | 'critical' | 'in-progress') {
  if (status === 'closed') return styles.statusClosed
  if (status === 'critical') return styles.statusCritical
  if (status === 'in-progress') return styles.statusInProgress
  return styles.statusOpen
}

function Table({ columns, rows }: Pick<Extract<MSAItem, { type: 'table' }>, 'columns' | 'rows'>) {
  return (
    <View style={styles.tableWrap} minPresenceAhead={36}>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {columns.map((column, index) => (
            <Text
              key={`${column.header}-${index}`}
              style={[
                styles.headerCell,
                { flexGrow: column.weight, flexBasis: 0, borderRightWidth: index === columns.length - 1 ? 0 : 0.5 },
              ]}
            >
              {column.header}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.tableRow} minPresenceAhead={24}>
            {columns.map((column, cellIndex) => (
              <View
                key={`${rowIndex}-${cellIndex}`}
                style={[
                  rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt,
                  {
                    flexGrow: column.weight,
                    flexBasis: 0,
                    backgroundColor: rowColor(rowIndex),
                    borderRightWidth: cellIndex === columns.length - 1 ? 0 : 0.5,
                  },
                ]}
              >
                <Text style={styles.cellText}>{row[cellIndex] ?? ''}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

function StatusTable({
  columns,
  rows,
}: Pick<Extract<MSAItem, { type: 'status_table' }>, 'columns' | 'rows'>) {
  return (
    <View style={styles.tableWrap} minPresenceAhead={40}>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {columns.map((column, index) => (
            <Text
              key={`${column.header}-${index}`}
              style={[
                styles.headerCell,
                { flexGrow: column.weight, flexBasis: 0, borderRightWidth: index === columns.length - 1 ? 0 : 0.5 },
              ]}
            >
              {column.header}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={`status-row-${rowIndex}`} style={styles.tableRow} minPresenceAhead={28}>
            {columns.map((column, cellIndex) => {
              const isLast = cellIndex === columns.length - 1
              return (
                <View
                  key={`${rowIndex}-${cellIndex}`}
                  style={[
                    rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt,
                    {
                      flexGrow: column.weight,
                      flexBasis: 0,
                      backgroundColor: rowColor(rowIndex),
                      borderRightWidth: isLast ? 0 : 0.5,
                    },
                    ...(isLast ? [styles.statusWrap] : []),
                  ]}
                  >
                    {isLast ? (
                      <Text style={statusStyle(row.status)}>{formatStatus(row.status)}</Text>
                    ) : (
                      <Text style={styles.cellText}>{row.cells[cellIndex] ?? ''}</Text>
                    )}
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

function SignoffTable({
  columns,
  rows,
}: Pick<Extract<MSAItem, { type: 'signoff_table' }>, 'columns' | 'rows'>) {
  return (
    <View style={styles.tableWrap} minPresenceAhead={40}>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          {columns.map((column, index) => (
            <Text
              key={`${column.header}-${index}`}
              style={[
                styles.headerCell,
                { flexGrow: column.weight, flexBasis: 0, borderRightWidth: index === columns.length - 1 ? 0 : 0.5 },
              ]}
            >
              {column.header}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={`signoff-row-${rowIndex}`} style={styles.tableRow} minPresenceAhead={28}>
            <View style={[rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt, { flexGrow: columns[0].weight, flexBasis: 0 }]}>
              <Text style={styles.cellText}>{row.name}</Text>
            </View>
            <View style={[rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt, { flexGrow: columns[1].weight, flexBasis: 0 }]}>
              <Text style={styles.cellText}>{row.organization}</Text>
            </View>
            <View style={[rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt, styles.signImageWrap, { flexGrow: columns[2].weight, flexBasis: 0 }]}>
              {row.signatureData ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image is not a DOM element.
                <Image src={row.signatureData} style={styles.signImage} />
              ) : row.signUrl ? (
                <Link src={row.signUrl} style={{ fontSize: 8, color: '#1D4ED8', textDecoration: 'underline' }}>
                  Click to sign
                </Link>
              ) : (
                <Text style={styles.signPlaceholder}>Pending</Text>
              )}
            </View>
            <View style={[rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt, { flexGrow: columns[3].weight, flexBasis: 0 }]}>
              <Text style={styles.cellText}>{row.signatureDate}</Text>
            </View>
            <View style={[rowIndex % 2 === 0 ? styles.bodyCell : styles.bodyCellAlt, { flexGrow: columns[4].weight, flexBasis: 0 }]}>
              <Text style={styles.cellText}>{row.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function FieldsGrid({ data }: Pick<Extract<MSAItem, { type: 'fields' }>, 'data'>) {
  const pairs = Array.from({ length: Math.ceil(data.length / 2) }).map((_, i) => [data[i * 2], data[i * 2 + 1]])

  return (
    <View style={styles.fieldsGrid} wrap={false}>
      {pairs.map((pair, rowIndex) => (
        <View
          key={`field-row-${rowIndex}`}
          style={[
            styles.fieldRow,
            { backgroundColor: rowColor(rowIndex), borderBottomWidth: rowIndex === pairs.length - 1 ? 0 : 0.5 },
          ]}
          wrap={false}
        >
          {pair.map((field, colIndex) => (
            <View
              key={`field-${rowIndex}-${colIndex}`}
              style={[styles.fieldCol, { borderRightWidth: colIndex === pair.length - 1 ? 0 : 0.5 }]}
            >
              <Text style={LABEL_TEXT}>{(field?.label ?? '').toUpperCase()}</Text>
              <Text style={VALUE_TEXT}>{field?.value ?? ''}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function renderItem(item: MSAItem, key: string) {
  switch (item.type) {
    case 'paragraph':
      return (
        <Text key={key} style={styles.paragraph}>
          {item.text}
        </Text>
      )
    case 'fields':
      return <FieldsGrid key={key} data={item.data} />
    case 'table':
      return <Table key={key} columns={item.columns} rows={item.rows} />
    case 'status_table':
      return <StatusTable key={key} columns={item.columns} rows={item.rows} />
    case 'signoff_table':
      return <SignoffTable key={key} columns={item.columns} rows={item.rows} />
    case 'outcome':
      return (
        <View key={key} style={[styles.block, styles.outcomeBlock]}>
          <Text style={[styles.blockLabel, { color: BLUE }]}>OUTCOME</Text>
          <Text style={BODY_TEXT}>{item.text}</Text>
        </View>
      )
    case 'action':
      return (
        <View key={key} style={[styles.block, styles.actionBlock]}>
          <Text style={[styles.blockLabel, { color: GREEN }]}>ACTION REQUIRED</Text>
          <Text style={BODY_TEXT}>{item.text}</Text>
        </View>
      )
    case 'warning':
      return (
        <View key={key} style={[styles.block, styles.warningBlock]}>
          <Text style={[styles.blockLabel, { color: AMBER }]}>WARNING</Text>
          <Text style={BODY_TEXT}>{item.text}</Text>
        </View>
      )
    default:
      return null
  }
}

function Section({ section }: { section: MSASection }) {
  return (
    <View minPresenceAhead={120}>
      <SectionBanner title={section.title} />
      {section.items.map((item, itemIndex) => renderItem(item, `${section.title}-${itemIndex}`))}
    </View>
  )
}

export function MSADocument(props: MSADocumentProps) {
  const docTitle = truncateTitle(props.title)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - not fixed, only appears on first page */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{props.companyName || 'Buildstate'}</Text>
              <Text style={SUBTITLE_STYLE}>{props.documentType}</Text>
            </View>
            <View style={styles.logoBox}>
              {props.companyLogoUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image is not a DOM <img> and has no alt prop.
                <Image src={props.companyLogoUrl} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoText}>BUILDSTATE</Text>
              )}
            </View>
          </View>

          <View style={styles.hr} />

          <View style={styles.metadataRow}>
            {[
              { label: 'Document No', value: props.documentNo },
              { label: 'Date', value: props.date },
              { label: 'Revision', value: props.revision },
            ].map((meta, index) => (
              <View key={meta.label} style={[styles.metaCell, { marginRight: index === 2 ? 0 : 6 }]}>
                <Text style={LABEL_TEXT}>{meta.label.toUpperCase()}</Text>
                <Text style={VALUE_TEXT}>{meta.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <View style={styles.titleBanner}>
              <Text style={styles.title}>{props.title}</Text>
              {props.subtitle ? <Text style={styles.titleSubtitle}>{props.subtitle}</Text> : null}
            </View>
            <View style={styles.titleMetaGrid}>
              {[
                { label: 'Project', value: props.project },
                { label: 'Client', value: props.client },
                { label: 'Prepared By', value: props.preparedBy },
                { label: 'Date', value: props.date },
              ].map((meta) => (
                <View key={meta.label} style={styles.titleMetaCell}>
                  <Text style={LABEL_TEXT}>{meta.label.toUpperCase()}</Text>
                  <Text style={VALUE_TEXT}>{meta.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {props.sections.map((section, index) => (
            <Section key={`${section.title}-${index}`} section={section} />
          ))}

        </View>

        <View fixed style={styles.footer}>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={[FOOTER_TEXT, styles.footerCell]}>{props.companyName || 'Buildstate'} — Document Export</Text>
            <Text
              style={[FOOTER_TEXT, styles.footerCell, styles.footerRight]}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
          <View style={styles.footerRow}>
            <Text style={[FOOTER_TEXT, styles.footerCell, styles.footerCenter]}>{docTitle}</Text>
            <Text style={[styles.footerCell, styles.footerRight, styles.footerBrand]}>via Buildstate</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
