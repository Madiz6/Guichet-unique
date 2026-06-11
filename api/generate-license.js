import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    // Role check: admin or agent only
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'agent')) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { dossier_id } = req.body
    if (!dossier_id) return res.status(400).json({ error: 'dossier_id requis' })

    const { data: dossier, error: dossierError } = await supabase
      .from('registration_dossiers').select('*').eq('id', dossier_id).single()
    if (dossierError || !dossier) return res.status(404).json({ error: 'Dossier introuvable' })

    // Get official sequential numbers from Postgres RPCs
    const { data: licenseNumberData } = await supabase.rpc('next_license_number')
    const { data: numeroRegistreData } = await supabase.rpc('next_numero_registre')

    const licenseNumber = licenseNumberData || `ANPI-DJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`
    const numeroRegistre = numeroRegistreData || `RC-DJ-${new Date().getFullYear()}/${Math.floor(Math.random() * 90000) + 10000}`

    const issuedDate = new Date().toISOString().split('T')[0]
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const stepData = dossier.step_data || {}
    const activite = stepData.activite || {}
    const idData = stepData.identification?.data || {}
    const companyName = activite.commercial_names?.[0] || activite.raison_sociale || dossier.company_name || ''
    const formeJuridique = activite.forme_juridique || dossier.forme_juridique || ''
    const secteur = activite.secteur_principal || ''
    const capital = activite.capital_social ? `${Number(activite.capital_social).toLocaleString('fr-FR')} DJF` : '—'
    const repName = idData.prenom ? `${idData.prenom} ${idData.nom}` : (dossier.applicant_name || '')

    // Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, H = 297

    doc.setDrawColor(26, 43, 107)
    doc.setLineWidth(3)
    doc.rect(10, 10, W - 20, H - 20)
    doc.setLineWidth(1)
    doc.rect(13, 13, W - 26, H - 26)

    doc.setFillColor(26, 43, 107)
    doc.rect(10, 10, W - 20, 35, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('REPUBLIQUE DE DJIBOUTI', W / 2, 22, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Unité — Égalité — Paix', W / 2, 28, { align: 'center' })
    doc.text('Ministère du Commerce, de l\'Industrie et du Tourisme', W / 2, 33, { align: 'center' })
    doc.text('Agence Nationale pour la Promotion des Investissements (ANPI)', W / 2, 38, { align: 'center' })

    doc.setTextColor(26, 43, 107)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('LICENCE D\'EXERCICE D\'ACTIVITÉ COMMERCIALE', W / 2, 60, { align: 'center' })
    doc.setFontSize(10)
    doc.text('Guichet Unique — Enregistrement d\'Entreprise', W / 2, 68, { align: 'center' })

    doc.setDrawColor(26, 43, 107)
    doc.setLineWidth(0.8)
    doc.line(20, 73, W - 20, 73)

    doc.setFillColor(240, 244, 255)
    doc.setDrawColor(26, 43, 107)
    doc.setLineWidth(0.5)
    doc.roundedRect(55, 77, W - 110, 14, 3, 3, 'FD')
    doc.setTextColor(26, 43, 107)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`N° ${licenseNumber}`, W / 2, 86, { align: 'center' })

    const nif = dossier.nif || '—' // NIF entered by DGI agent, not auto-generated

    const fields = [
      ['Dénomination sociale', companyName],
      ['Forme juridique', formeJuridique],
      ['Secteur d\'activité', secteur],
      ['Capital social', capital],
      ['Représentant légal', repName],
      ['Numéro NIF', nif],
      ['N° Registre de Commerce', numeroRegistre],
      ['Date d\'émission', new Date(issuedDate).toLocaleDateString('fr-FR')],
      ['Date d\'expiration', new Date(expiryDate).toLocaleDateString('fr-FR')],
    ]

    let y = 102
    doc.setFontSize(9)
    fields.forEach(([label, val], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(249, 249, 249)
        doc.rect(20, y - 5, W - 40, 12, 'F')
      }
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text(label + ' :', 24, y + 2)
      doc.setTextColor(26, 26, 26)
      doc.setFont('helvetica', 'bold')
      doc.text(String(val || '—'), 90, y + 2)
      y += 13
    })

    y += 5

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(20, y, W - 20, y)
    y += 8

    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const certText = `La présente licence certifie que la société susmentionnée est dûment enregistrée et autorisée à exercer ses activités commerciales sur le territoire de la République de Djibouti, conformément aux lois et règlements en vigueur, et notamment le Code de Commerce et les textes pris pour son application.`
    const lines = doc.splitTextToSize(certText, W - 40)
    doc.text(lines, 20, y)
    y += lines.length * 5 + 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(26, 43, 107)
    doc.text('OBLIGATIONS DU TITULAIRE :', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const obligations = [
      '• Exercer exclusivement les activités mentionnées sur la présente licence',
      '• Renouveler la licence avant sa date d\'expiration',
      '• Respecter toutes les obligations fiscales, sociales et commerciales',
      '• Informer l\'ANPI de tout changement relatif aux informations déclarées',
    ]
    obligations.forEach(o => { doc.text(o, 24, y); y += 5 })
    y += 5

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(20, y, W - 20, y)
    y += 10

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 26, 26)
    doc.text('Pour la Direction Générale de l\'ANPI', 40, y, { align: 'center' })
    doc.text('Le Titulaire', W - 40, y, { align: 'center' })
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Signature et cachet', 40, y, { align: 'center' })
    doc.text('Signature', W - 40, y, { align: 'center' })
    y += 25
    doc.setDrawColor(150, 150, 150)
    doc.line(20, y, 80, y)
    doc.line(W - 80, y, W - 20, y)

    doc.setFillColor(26, 43, 107)
    doc.rect(10, H - 25, W - 20, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ANPI Djibouti — Guichet Unique d'Investissement`, W / 2, H - 19, { align: 'center' })
    doc.text(`Ref. Dossier: ${dossier.envelope_id || dossier_id} | Vérifiez l'authenticité sur anpi.dj`, W / 2, H - 14, { align: 'center' })

    // Upload PDF to private "dossiers" bucket
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const storagePath = `licenses/${dossier_id}/licence-${licenseNumber}.pdf`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dossiers')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    let licensePdfUrl = null
    if (!uploadError) {
      const { data: urlData } = await supabase.storage
        .from('dossiers')
        .createSignedUrl(uploadData.path, 86400) // 24h signed URL
      licensePdfUrl = urlData?.signedUrl || null
    }

    // Update dossier
    await supabase.from('registration_dossiers').update({
      license_number: licenseNumber,
      numero_registre: numeroRegistre,
      license_issued_date: issuedDate,
      license_expiry_date: expiryDate,
      license_pdf_path: storagePath,
      statut: 'Validé',
      admin_email: user.email,
      date_traitement: issuedDate,
    }).eq('id', dossier_id)

    // Audit log
    await supabase.from('audit_logs').insert({
      user_email: user.email,
      action: 'LICENSE_GENERATED',
      entity_type: 'registration_dossier',
      entity_id: dossier_id,
      changes: { license_number: licenseNumber, numero_registre: numeroRegistre },
    })

    return res.json({
      success: true,
      license_number: licenseNumber,
      numero_registre: numeroRegistre,
      license_issued_date: issuedDate,
      license_expiry_date: expiryDate,
      license_pdf_url: licensePdfUrl,
      pdf_base64: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
    })
  } catch (error) {
    console.error('generateLicense error:', error)
    return res.status(500).json({ error: error.message })
  }
}
