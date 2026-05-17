import { useNavigate } from 'react-router-dom'
import DnaLetterI from '../components/DnaLetterI'
import ThemeToggle from '../components/ThemeToggle'
import DnaSkillMap from '../components/DnaSkillMap'
import ChatBar from '../components/ChatBar'
import { useTheme } from '../context/ThemeContext'
import '../styles/results.css'

/* ── Placeholder data ─────────────────────────────────────────────────────
   Replace with agent output when backend is ready.
   Shape: { id, name, detail, transferability, opportunities, matchScore? }
──────────────────────────────────────────────────────────────────────────── */
const USER_SKILLS = [
  {
    id: 'u1', name: 'Forklift Operation',
    detail: 'You have demonstrated proficiency in operating forklifts in warehouse and manufacturing environments, including load handling, safety protocols, and equipment maintenance checks.',
    transferability: 'Forklift operation maps directly to roles in logistics, distribution centers, and automated warehouse coordination. The spatial reasoning and load-management discipline you developed are highly portable.',
    opportunities: 'Supply Chain Coordinator, Warehouse Supervisor, Logistics Operations Lead, Distribution Center Manager',
    matchScore: 91,
  },
  {
    id: 'u2', name: 'Quality Control',
    detail: 'Your experience includes inspecting products against specification sheets, logging defects, running statistical sampling, and interfacing with production teams to resolve non-conformances.',
    transferability: 'Quality Control translates strongly into manufacturing quality assurance, regulatory compliance, and even software QA. Attention to standards and documentation is universally valued.',
    opportunities: 'QA Engineer, Compliance Analyst, Process Auditor, Product Inspection Lead',
    matchScore: 87,
  },
  {
    id: 'u3', name: 'Assembly Line Mgmt',
    detail: 'You have coordinated multi-person assembly workflows, managed line throughput targets, and identified bottlenecks to optimize production cycles.',
    transferability: 'Assembly line management underpins lean manufacturing roles, operations management, and production planning. Leadership of structured workflows is a core competency in many advanced manufacturing sectors.',
    opportunities: 'Production Supervisor, Operations Manager, Manufacturing Engineer, Plant Manager',
    matchScore: 84,
  },
  {
    id: 'u4', name: 'Inventory Management',
    detail: 'You have tracked stock levels, performed cycle counts, managed reorder points, and worked with inventory management systems to maintain accurate records.',
    transferability: 'Inventory management is foundational to supply chain, procurement, and ERP-driven operations. The data discipline you built transfers well into analytics and systems-based roles.',
    opportunities: 'Procurement Specialist, Supply Chain Analyst, ERP Coordinator, Inventory Control Manager',
    matchScore: 89,
  },
  {
    id: 'u5', name: 'CNC Machine Operation',
    detail: 'You are skilled in setting up, operating, and performing minor maintenance on CNC machines including lathes and mills, reading G-code, and maintaining dimensional tolerances.',
    transferability: 'CNC operation is evolving into CNC programming and robotics integration. The precision mindset and technical literacy you possess are direct pathways into advanced manufacturing and automation.',
    opportunities: 'CNC Programmer, Robotics Technician, Machining Engineer, Automation Specialist',
    matchScore: 78,
  },
  {
    id: 'u6', name: 'Safety Compliance',
    detail: 'You have maintained OSHA compliance records, conducted safety briefings, investigated near-miss incidents, and implemented corrective action plans on the shop floor.',
    transferability: 'Safety compliance expertise is highly transferable to EHS (Environmental Health & Safety) management, regulatory affairs, and risk assessment roles across industries.',
    opportunities: 'EHS Coordinator, Safety Manager, Risk Analyst, Regulatory Affairs Specialist',
    matchScore: 82,
  },
  {
    id: 'u7', name: 'Team Leadership',
    detail: 'You have led teams of 5–15 workers, handled shift handoffs, motivated performance, and served as the escalation point for operational issues.',
    transferability: 'Team leadership is one of the most universally transferable skills in the workforce. It applies to project management, operations leadership, and any people-facing role across sectors.',
    opportunities: 'Operations Team Lead, Project Coordinator, Production Manager, Training Supervisor',
    matchScore: 95,
  },
  {
    id: 'u8', name: 'Process Optimization',
    detail: 'You have applied time-motion studies and basic lean tools (5S, Kaizen) to reduce cycle times and eliminate waste in production workflows.',
    transferability: 'Process optimization is directly applicable to industrial engineering, operational excellence, and continuous improvement roles. Companies across all industries prize this skill.',
    opportunities: 'Industrial Engineer, Continuous Improvement Analyst, Lean Consultant, Operations Analyst',
    matchScore: 80,
  },
]

const SUGGESTED_SKILLS = [
  {
    id: 's1', name: 'Supply Chain Ops',
    detail: 'Supply Chain Operations covers end-to-end coordination of goods from source to delivery, including vendor management, logistics planning, and demand forecasting.',
    transferability: 'Your existing inventory management and forklift experience covers 68% of the hands-on competencies needed. The gap is primarily in vendor negotiation and ERP-system fluency.',
    opportunities: 'Supply Chain Coordinator, Logistics Planner, Procurement Analyst, Distribution Manager',
    matchScore: 68,
  },
  {
    id: 's2', name: 'Data Analytics',
    detail: 'Data analytics involves collecting, cleaning, and interpreting operational data to support decision-making — using tools like Excel, SQL, Power BI, or Python.',
    transferability: 'Your quality control and inventory background already involves data collection and interpretation. Bridging to formal analytics requires learning one visualization tool and basic statistics.',
    opportunities: 'Operations Analyst, Data Technician, BI Report Developer, Production Data Analyst',
    matchScore: 55,
  },
  {
    id: 's3', name: 'Warehouse Mgmt Systems',
    detail: 'WMS platforms (Manhattan, SAP EWM, Oracle WMS) digitize warehouse operations including receiving, putaway, picking, and shipping with real-time inventory visibility.',
    transferability: 'You already understand the physical workflows these systems automate. Learning a WMS is primarily interface-level training and positions you for significantly higher-paying roles.',
    opportunities: 'WMS Administrator, Warehouse Systems Analyst, Logistics Systems Lead, Operations Tech Specialist',
    matchScore: 76,
  },
  {
    id: 's4', name: 'Lean Manufacturing',
    detail: 'Lean Manufacturing is a systematic method for minimizing waste without sacrificing productivity. Core tools include Value Stream Mapping, 5S, Kaizen, and Kanban.',
    transferability: 'Your process optimization experience with 5S and Kaizen gives you a strong foundation. A formal Lean or Six Sigma certification would formalize and expand this into high-demand roles.',
    opportunities: 'Lean Coordinator, Continuous Improvement Engineer, Six Sigma Black Belt, Operations Excellence Lead',
    matchScore: 72,
  },
  {
    id: 's5', name: 'ERP Systems (SAP)',
    detail: 'Enterprise Resource Planning systems like SAP integrate finance, HR, manufacturing, and supply chain data into a unified platform used by thousands of Michigan employers.',
    transferability: 'SAP training typically takes 3–6 months. Your operational background means you understand the business processes these systems support — giving you a significant learning advantage over non-operations learners.',
    opportunities: 'SAP Functional Consultant, ERP Coordinator, Systems Analyst, Business Process Analyst',
    matchScore: 60,
  },
  {
    id: 's6', name: 'Project Management',
    detail: 'Project management involves scoping, planning, executing, and closing work initiatives on time and within budget, using frameworks like PMP, Agile, or PRINCE2.',
    transferability: 'Your team leadership and process optimization experience maps directly to project management competencies. A PMP or CAPM certification formalizes skills you are already practicing informally.',
    opportunities: 'Project Coordinator, Operations Project Manager, PMO Analyst, Program Lead',
    matchScore: 83,
  },
  {
    id: 's7', name: 'Technical Writing',
    detail: 'Technical writing produces documentation — SOPs, work instructions, training guides, and safety manuals — that industrial operations depend on for consistency and compliance.',
    transferability: 'Your safety compliance and process roles required writing and maintaining SOPs. Formalizing this into technical writing broadens your appeal to corporate quality, training, and documentation teams.',
    opportunities: 'Technical Writer, Documentation Specialist, Training Content Developer, SOP Coordinator',
    matchScore: 65,
  },
  {
    id: 's8', name: 'Robotics Integration',
    detail: 'Robotics integration involves programming, deploying, and maintaining industrial robots and collaborative robots (cobots) in manufacturing environments.',
    transferability: 'Your CNC operation background gives you the mechanical intuition and precision discipline that robotics integration requires. Targeted training in robot programming (FANUC, UR) is the primary bridge.',
    opportunities: 'Robotics Technician, Automation Engineer, Cobot Operator, Manufacturing Systems Specialist',
    matchScore: 58,
  },
  {
    id: 's9', name: 'IoT Fundamentals',
    detail: 'Industrial IoT (IIoT) connects machines, sensors, and software to provide real-time production data, predictive maintenance signals, and operational intelligence.',
    transferability: 'Your shop-floor experience gives you context for what IoT data means in practice — a huge advantage over purely technical learners. Basic sensor literacy and data interpretation are the key skills to acquire.',
    opportunities: 'IIoT Technician, Smart Factory Operator, Connected Systems Analyst, Predictive Maintenance Lead',
    matchScore: 50,
  },
  {
    id: 's10', name: 'Digital Manufacturing',
    detail: 'Digital manufacturing integrates simulation, digital twins, and real-time data to optimize factory operations — a growing priority for Michigan automotive and defense manufacturers.',
    transferability: 'Your assembly line and process optimization experience is the experiential foundation. Digital manufacturing roles seek people who understand physical operations and can translate them into digital models.',
    opportunities: 'Digital Manufacturing Analyst, Smart Factory Coordinator, Industry 4.0 Specialist, Digital Operations Lead',
    matchScore: 54,
  },
]

export default function ResultsPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dnaColor = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  return (
    <div className="results-root">

      {/* ── Top bar ── */}
      <div className="results-topbar">
        <button className="topbar-logo-btn" onClick={() => navigate('/')} title="Home">
          <DnaLetterI height={36} color={dnaColor} />
        </button>
        <div className="results-topbar-right">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* ── Page heading ── */}
      <div className="results-heading">
        <h1 className="results-title">Your SkillDNA Map</h1>
        <p className="results-subtitle">
          Click any skill node to explore details and career pathways.
          <span className="results-legend">
            <span className="legend-dot legend-dot-user" />Your Skills
            <span className="legend-dot legend-dot-suggested" />Suggested Skills
          </span>
        </p>
      </div>

      {/* ── DNA Skill Map ── */}
      <div className="results-map-section">
        <DnaSkillMap
          userSkills={USER_SKILLS}
          suggestedSkills={SUGGESTED_SKILLS}
          color={dnaColor}
        />
      </div>

      {/* ── Chat bar ── */}
      <ChatBar />

    </div>
  )
}
