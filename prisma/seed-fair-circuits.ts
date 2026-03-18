/**
 * seed-fair-circuits.ts
 * EdUmeetup — India Fair Circuit Master Seed
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-fair-circuits.ts
 * Or add to prisma/seed.ts and run:
 *   npx prisma db seed
 *
 * Safe to run multiple times — uses upsert on slug/institutionName+city.
 * Does NOT delete existing data.
 */

import { PrismaClient, FairCircuitStatus } from '@prisma/client'

const prisma = new PrismaClient()

// ── Circuit + Venue data ──────────────────────────────────────────────────────

const circuits = [
  // ══════════════════════════════════════════════════════════════════════════
  // CIRCUIT W — WEST INDIA
  // Gujarat + Maharashtra | Best season: Oct–Dec
  // ══════════════════════════════════════════════════════════════════════════
  {
    slug:        'west-india',
    name:        'West India Circuit',
    description: 'Gujarat and Maharashtra — the strongest student pipeline in India for US universities. W1 covers Gujarat comprehensively: Ahmedabad, Gandhinagar, Anand (CHARUSAT), Nadiad (DDU), Mehsana (Ganpat), Vadodara. W2 covers South Gujarat and Maharashtra. W3 covers Nagpur as the central India bridge between West and East circuits.',
    region:      'WEST',
    season:      'Oct – Dec (post-monsoon, pleasant weather)',
    status:      FairCircuitStatus.PUBLISHED,
    venues: [
      // ── Cluster W1: Ahmedabad ─────────────────────────────────────────
      { institutionName: 'Nirma University',                              city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'CEPT University',                               city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'Gujarat University',                            city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'Ahmedabad University',                          city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'LD College of Engineering',                     city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'GLS University',                                city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Silver Oak University',                         city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Karnavati University',                          city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'SAL Engineering & Technical Institute',         city: 'Ahmedabad',   cluster: 'W1', tier: 'TIER2'   },
      // ── Cluster W1: Gandhinagar ───────────────────────────────────────
      { institutionName: 'Pandit Deendayal Energy University (PDEU)',     city: 'Gandhinagar', cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'Dhirubhai Ambani Institute (DA-IICT)',          city: 'Gandhinagar', cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'LDRP Institute of Technology & Research',       city: 'Gandhinagar', cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Institute of Advanced Research (IAR)',          city: 'Gandhinagar', cluster: 'W1', tier: 'TIER2'   },
      // ── Cluster W1: Anand & Nadiad ────────────────────────────────────
      { institutionName: 'CHARUSAT',                                      city: 'Anand',       cluster: 'W1', tier: 'SPECIAL' },
      { institutionName: 'SVIT Vasad',                                    city: 'Anand',       cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Anand Agricultural University',                 city: 'Anand',       cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'BVM Engineering College',                       city: 'Anand',       cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Government Engineering College Anand',          city: 'Anand',       cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Dharmsinh Desai University (DDU)',              city: 'Nadiad',      cluster: 'W1', tier: 'SPECIAL' },
      // ── Cluster W1: Mehsana & North Gujarat ──────────────────────────
      { institutionName: 'Ganpat University',                             city: 'Mehsana',     cluster: 'W1', tier: 'SPECIAL' },
      { institutionName: 'Hemchandracharya North Gujarat University',     city: 'Patan',       cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Government Engineering College Modasa',         city: 'Modasa',      cluster: 'W1', tier: 'TIER2'   },
      // ── Cluster W1: Vadodara ──────────────────────────────────────────
      { institutionName: 'MS University of Baroda',                       city: 'Vadodara',    cluster: 'W1', tier: 'TIER1'   },
      { institutionName: 'Parul University',                              city: 'Vadodara',    cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Navrachana University',                         city: 'Vadodara',    cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'BITS Edu Campus Vadodara',                      city: 'Vadodara',    cluster: 'W1', tier: 'TIER2'   },
      { institutionName: 'Parul Institute of Engineering & Technology',   city: 'Vadodara',    cluster: 'W1', tier: 'TIER2'   },
      // ── Cluster W2: South Gujarat + Maharashtra ───────────────────────
      { institutionName: 'SVNIT Surat',                                   city: 'Surat',       cluster: 'W2', tier: 'TIER1'   },
      { institutionName: 'Sarvajanik College of Engineering & Technology', city: 'Surat',       cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'Veer Narmad South Gujarat University',          city: 'Surat',       cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'VESIT Mumbai',                                  city: 'Mumbai',      cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'NMIMS University',                              city: 'Mumbai',      cluster: 'W2', tier: 'TIER1'   },
      { institutionName: 'DJ Sanghvi College of Engineering',             city: 'Mumbai',      cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'IIT Bombay (outreach)',                         city: 'Mumbai',      cluster: 'W2', tier: 'TIER1'   },
      { institutionName: 'K.J. Somaiya College of Engineering',           city: 'Mumbai',      cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'SIES Graduate School of Technology',            city: 'Mumbai',      cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'Symbiosis Institute of Technology',             city: 'Pune',        cluster: 'W2', tier: 'TIER1'   },
      { institutionName: 'College of Engineering Pune (COEP)',            city: 'Pune',        cluster: 'W2', tier: 'TIER1'   },
      { institutionName: 'MIT World Peace University',                    city: 'Pune',        cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'Savitribai Phule Pune University',              city: 'Pune',        cluster: 'W2', tier: 'TIER1'   },
      { institutionName: 'Vishwakarma Institute of Technology',           city: 'Pune',        cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'Sandip University',                             city: 'Nashik',      cluster: 'W2', tier: 'TIER2'   },
      { institutionName: 'KBC North Maharashtra University',              city: 'Nashik',      cluster: 'W2', tier: 'TIER2'   },
      // ── Cluster W3: Nagpur — Central India Bridge ─────────────────────
      { institutionName: 'VNIT Nagpur',                                   city: 'Nagpur',      cluster: 'W3', tier: 'TIER1'   },
      { institutionName: 'Rashtrasant Tukadoji Maharaj Nagpur University',city: 'Nagpur',      cluster: 'W3', tier: 'TIER2'   },
      { institutionName: 'G.H. Raisoni College of Engineering',           city: 'Nagpur',      cluster: 'W3', tier: 'TIER2'   },
      { institutionName: 'Symbiosis Institute of Technology Nagpur',      city: 'Nagpur',      cluster: 'W3', tier: 'TIER2'   },
      { institutionName: 'YCCE Nagpur',                                   city: 'Nagpur',      cluster: 'W3', tier: 'TIER2'   },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CIRCUIT S — SOUTH INDIA
  // Karnataka + Telangana + Tamil Nadu | Best season: Jan–Mar
  // ══════════════════════════════════════════════════════════════════════════
  {
    slug:        'south-india',
    name:        'South India Circuit',
    description: 'Three-state tour covering Karnataka (Bangalore–Mysore), Telangana (Hyderabad–Warangal) and Tamil Nadu (Chennai–Trichy–Coimbatore). The Tamil Nadu leg is best done by train — Shatabdi connects all three cities within 4 hours. Highest density of engineering talent in India.',
    region:      'SOUTH',
    season:      'Jan – Mar (cool and dry, ideal for travel)',
    status:      FairCircuitStatus.PUBLISHED,
    venues: [
      // ── Cluster S1: Karnataka ─────────────────────────────────────────
      { institutionName: 'IISc Bangalore (outreach)',                 city: 'Bangalore',  cluster: 'S1', tier: 'TIER1'   },
      { institutionName: 'RV College of Engineering',                 city: 'Bangalore',  cluster: 'S1', tier: 'TIER1'   },
      { institutionName: 'BMS College of Engineering',                city: 'Bangalore',  cluster: 'S1', tier: 'TIER1'   },
      { institutionName: 'Christ University',                         city: 'Bangalore',  cluster: 'S1', tier: 'TIER2'   },
      { institutionName: 'M.S. Ramaiah Institute of Technology',      city: 'Bangalore',  cluster: 'S1', tier: 'TIER2'   },
      { institutionName: 'PES University',                            city: 'Bangalore',  cluster: 'S1', tier: 'TIER2'   },
      { institutionName: 'Manipal Academy of Higher Education',       city: 'Manipal',    cluster: 'S1', tier: 'TIER1'   },
      { institutionName: 'JSS Science & Technology University',       city: 'Mysore',     cluster: 'S1', tier: 'TIER1'   },
      { institutionName: 'University of Mysore',                      city: 'Mysore',     cluster: 'S1', tier: 'TIER2'   },
      // ── Cluster S2: Telangana ─────────────────────────────────────────
      { institutionName: 'BITS Pilani Hyderabad Campus',              city: 'Hyderabad',  cluster: 'S2', tier: 'TIER1'   },
      { institutionName: 'University of Hyderabad',                   city: 'Hyderabad',  cluster: 'S2', tier: 'TIER1'   },
      { institutionName: 'Chaitanya Bharathi Institute of Technology',city: 'Hyderabad',  cluster: 'S2', tier: 'TIER2'   },
      { institutionName: 'JNTU Hyderabad',                            city: 'Hyderabad',  cluster: 'S2', tier: 'TIER1'   },
      { institutionName: 'Mahindra University',                       city: 'Hyderabad',  cluster: 'S2', tier: 'TIER2'   },
      { institutionName: 'NIT Warangal',                              city: 'Warangal',   cluster: 'S2', tier: 'TIER1'   },
      { institutionName: 'Kakatiya University',                       city: 'Warangal',   cluster: 'S2', tier: 'TIER2'   },
      // ── Cluster S3: Tamil Nadu Triangle ──────────────────────────────
      { institutionName: 'Anna University',                           city: 'Chennai',    cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'SSN College of Engineering',                city: 'Chennai',    cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'SRM Institute of Science & Technology',     city: 'Chennai',    cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'Vellore Institute of Technology (VIT)',     city: 'Vellore',    cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'NIT Trichy',                                city: 'Trichy',     cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'Saranathan College of Engineering',         city: 'Trichy',     cluster: 'S3', tier: 'TIER2'   },
      { institutionName: 'Bharathidasan University',                  city: 'Trichy',     cluster: 'S3', tier: 'TIER2'   },
      { institutionName: 'PSG College of Technology',                 city: 'Coimbatore', cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'Amrita Vishwa Vidyapeetham',                city: 'Coimbatore', cluster: 'S3', tier: 'TIER1'   },
      { institutionName: 'Coimbatore Institute of Technology',        city: 'Coimbatore', cluster: 'S3', tier: 'TIER2'   },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CIRCUIT N — NORTH INDIA
  // Delhi NCR + Rajasthan + UP | Best season: Feb–Apr
  // ══════════════════════════════════════════════════════════════════════════
  {
    slug:        'north-india',
    name:        'North India Circuit',
    description: 'Four-cluster north India tour — Delhi NCR (capital region), Rajasthan (Jaipur–Kota), UP corridor (Lucknow–Kanpur–Varanasi), and Chandigarh–Punjab. Avoid Dec–Jan due to Delhi smog. The Kota stop is unique — massive aspirant population transitioning from competitive exam prep to international study. Chandigarh–Punjab has one of the highest US-bound student densities in India.',
    region:      'NORTH',
    season:      'Feb – Apr (avoid Dec–Jan smog season)',
    status:      FairCircuitStatus.PUBLISHED,
    venues: [
      // ── Cluster N1: Delhi NCR ─────────────────────────────────────────
      { institutionName: 'Delhi University Colleges (outreach)',       city: 'Delhi',      cluster: 'N1', tier: 'TIER1'   },
      { institutionName: 'Jamia Millia Islamia',                      city: 'Delhi',      cluster: 'N1', tier: 'TIER1'   },
      { institutionName: 'Delhi Technological University',            city: 'Delhi',      cluster: 'N1', tier: 'TIER1'   },
      { institutionName: 'Netaji Subhas University of Technology',    city: 'Delhi',      cluster: 'N1', tier: 'TIER2'   },
      { institutionName: 'Amity University Noida',                    city: 'Noida',      cluster: 'N1', tier: 'TIER2'   },
      { institutionName: 'Shiv Nadar University',                     city: 'Greater Noida', cluster: 'N1', tier: 'TIER1' },
      { institutionName: 'JIIT Noida',                                city: 'Noida',      cluster: 'N1', tier: 'TIER2'   },
      { institutionName: 'Galgotias University',                      city: 'Greater Noida', cluster: 'N1', tier: 'TIER2' },
      { institutionName: 'Manav Rachna University',                   city: 'Faridabad',  cluster: 'N1', tier: 'TIER2'   },
      // ── Cluster N2: Rajasthan ─────────────────────────────────────────
      { institutionName: 'MNIT Jaipur',                               city: 'Jaipur',     cluster: 'N2', tier: 'TIER1'   },
      { institutionName: 'Manipal University Jaipur',                 city: 'Jaipur',     cluster: 'N2', tier: 'TIER2'   },
      { institutionName: 'University of Rajasthan',                   city: 'Jaipur',     cluster: 'N2', tier: 'TIER2'   },
      { institutionName: 'LNM Institute of Information Technology',   city: 'Jaipur',     cluster: 'N2', tier: 'TIER1'   },
      { institutionName: 'Poornima University',                       city: 'Jaipur',     cluster: 'N2', tier: 'TIER2'   },
      { institutionName: 'Allen Career Institute (outreach)',          city: 'Kota',       cluster: 'N2', tier: 'SPECIAL' },
      { institutionName: 'University of Kota',                        city: 'Kota',       cluster: 'N2', tier: 'TIER2'   },
      // ── Cluster N3: UP Corridor ───────────────────────────────────────
      { institutionName: 'Amity University Lucknow',                  city: 'Lucknow',    cluster: 'N3', tier: 'TIER2'   },
      { institutionName: 'Lucknow University',                        city: 'Lucknow',    cluster: 'N3', tier: 'TIER2'   },
      { institutionName: 'BBD University Lucknow',                    city: 'Lucknow',    cluster: 'N3', tier: 'TIER2'   },
      { institutionName: 'IIT Kanpur (outreach)',                     city: 'Kanpur',     cluster: 'N3', tier: 'TIER1'   },
      { institutionName: 'HBTU Kanpur',                               city: 'Kanpur',     cluster: 'N3', tier: 'TIER2'   },
      { institutionName: 'CSJMU Kanpur',                              city: 'Kanpur',     cluster: 'N3', tier: 'TIER2'   },
      { institutionName: 'IIT BHU Varanasi',                          city: 'Varanasi',   cluster: 'N3', tier: 'TIER1'   },
      { institutionName: 'Banaras Hindu University (BHU)',            city: 'Varanasi',   cluster: 'N3', tier: 'TIER1'   },
      // ── Cluster N4: Chandigarh & Punjab ──────────────────────────────
      { institutionName: 'Punjab University',                         city: 'Chandigarh', cluster: 'N4', tier: 'TIER1'   },
      { institutionName: 'Punjab Engineering College (PEC)',          city: 'Chandigarh', cluster: 'N4', tier: 'TIER1'   },
      { institutionName: 'Chandigarh University',                     city: 'Chandigarh', cluster: 'N4', tier: 'TIER1'   },
      { institutionName: 'Panjab University Institute of Engineering', city: 'Chandigarh', cluster: 'N4', tier: 'TIER2'  },
      { institutionName: 'Chitkara University',                       city: 'Chandigarh', cluster: 'N4', tier: 'TIER2'   },
      { institutionName: 'Lovely Professional University',            city: 'Phagwara',   cluster: 'N4', tier: 'TIER2'   },
      { institutionName: 'Thapar Institute of Engineering & Technology', city: 'Patiala', cluster: 'N4', tier: 'TIER1'   },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CIRCUIT E — EAST INDIA
  // West Bengal + Odisha + Northeast | Best season: Mar–Apr
  // ══════════════════════════════════════════════════════════════════════════
  {
    slug:        'east-india',
    name:        'East India Circuit',
    description: 'Two-cluster east India tour — Bengal–Odisha corridor (Kolkata–Bhubaneswar–Cuttack) and the Northeast gateway (Guwahati–Shillong). The Kolkata–Bhubaneswar leg requires an overnight Rajdhani train or 1-hour flight. Northeast cluster is optional in year one — add once the western and southern circuits are established.',
    region:      'EAST',
    season:      'Mar – Apr (pre-summer, post-winter)',
    status:      FairCircuitStatus.PUBLISHED,
    venues: [
      // ── Cluster E1: Bengal–Odisha ─────────────────────────────────────
      { institutionName: 'Jadavpur University',                       city: 'Kolkata',     cluster: 'E1', tier: 'TIER1'   },
      { institutionName: 'Presidency University',                     city: 'Kolkata',     cluster: 'E1', tier: 'TIER1'   },
      { institutionName: 'Heritage Institute of Technology',          city: 'Kolkata',     cluster: 'E1', tier: 'TIER2'   },
      { institutionName: 'Techno India University',                   city: 'Kolkata',     cluster: 'E1', tier: 'TIER2'   },
      { institutionName: 'MAKAUT (Maulana Abul Kalam Azad)',          city: 'Kolkata',     cluster: 'E1', tier: 'TIER2'   },
      { institutionName: 'IIT Bhubaneswar',                           city: 'Bhubaneswar', cluster: 'E1', tier: 'TIER1'   },
      { institutionName: 'KIIT University',                           city: 'Bhubaneswar', cluster: 'E1', tier: 'TIER1'   },
      { institutionName: 'NIT Rourkela',                              city: 'Rourkela',    cluster: 'E1', tier: 'TIER1'   },
      { institutionName: 'Utkal University',                          city: 'Bhubaneswar', cluster: 'E1', tier: 'TIER2'   },
      { institutionName: 'Ravenshaw University',                      city: 'Cuttack',     cluster: 'E1', tier: 'TIER2'   },
      // ── Cluster E2: Northeast Gateway (year 2+) ───────────────────────
      { institutionName: 'IIT Guwahati',                              city: 'Guwahati',    cluster: 'E2', tier: 'TIER1'   },
      { institutionName: 'Gauhati University',                        city: 'Guwahati',    cluster: 'E2', tier: 'TIER2'   },
      { institutionName: 'Assam Engineering College',                 city: 'Guwahati',    cluster: 'E2', tier: 'TIER2'   },
      { institutionName: 'NEHU Shillong',                             city: 'Shillong',    cluster: 'E2', tier: 'TIER1'   },
      { institutionName: 'Don Bosco University',                      city: 'Guwahati',    cluster: 'E2', tier: 'TIER2'   },
    ],
  },
]

// ── Seed function ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding India Fair Circuits...\n')

  let totalCircuits = 0
  let totalVenues = 0

  for (const circuit of circuits) {
    const { venues, ...circuitData } = circuit

    // Upsert circuit
    const createdCircuit = await prisma.fairCircuit.upsert({
      where:  { slug: circuitData.slug },
      update: {
        name:        circuitData.name,
        description: circuitData.description,
        status:      circuitData.status,
      },
      create: {
        slug:        circuitData.slug,
        name:        circuitData.name,
        description: circuitData.description,
        status:      circuitData.status,
        startDate:   new Date(), // Dummy date to satisfy schema requirements
        endDate:     new Date(new Date().setMonth(new Date().getMonth() + 1)), // One month later
      },
    })

    console.log(`  ✅ Circuit: ${createdCircuit.name} (${createdCircuit.id})`)
    totalCircuits++

    // Upsert each venue
    for (const venue of venues) {
      // Use institutionName + city as the natural unique key
      const existing = await prisma.fairVenue.findFirst({
        where: {
          institutionName: venue.institutionName,
          city:            venue.city,
          circuitId:       createdCircuit.id,
        }
      })

      if (existing) {
        await prisma.fairVenue.update({
          where: { id: existing.id },
          data: {
            tier:     venue.tier,
            // cluster:  venue.cluster, // cluster is not in schema
            isActive: true,
          }
        })
      } else {
        await prisma.fairVenue.create({
          data: {
            institutionName: venue.institutionName,
            city:            venue.city,
            // cluster:         venue.cluster, // cluster is not in schema
            tier:            venue.tier,
            circuitId:       createdCircuit.id,
            isActive:        true,
          }
        })
      }

      totalVenues++
    }

    console.log(`     └─ ${venues.length} venues seeded for ${circuitData.slug}\n`)
  }

  // Summary
  console.log('─────────────────────────────────────────')
  console.log(`✅ Done. ${totalCircuits} circuits, ${totalVenues} venues seeded.`)
  console.log('')
  console.log('Breakdown:')
  console.log('  Circuit W (West India)  — W1: Gujarat comprehensive, W2: South Gujarat + Maharashtra, W3: Nagpur')
  console.log('  Circuit S (South India) — S1: Karnataka, S2: Telangana, S3: Tamil Nadu')
  console.log('  Circuit N (North India) — N1: Delhi NCR, N2: Rajasthan, N3: UP corridor, N4: Chandigarh–Punjab')
  console.log('  Circuit E (East India)  — E1: Bengal–Odisha, E2: Northeast (year 2+)')
  console.log('')
  console.log('SPECIAL tier venues (IAES-known, outside main cities):')
  console.log('  CHARUSAT — Anand, Gujarat (W1)')
  console.log('  Dharmsinh Desai University (DDU) — Nadiad, Gujarat (W1)')
  console.log('  Ganpat University — Mehsana, Gujarat (W1)')
  console.log('  Allen Career Institute — Kota, Rajasthan (N2, outreach only)')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
