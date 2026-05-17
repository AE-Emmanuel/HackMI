import { useNavigate } from 'react-router-dom'
import SkilldnaLogo from '../components/SkilldnaLogo'
import ThemeToggle from '../components/ThemeToggle'
import SkillNetworkMap from '../components/SkillNetworkMap'
import ChatBar from '../components/ChatBar'
import { useTheme } from '../context/ThemeContext'
import '../styles/results.css'

/* ── Placeholder skill data ───────────────────────────────────────────────
   Shape: { id, name, detail, transferability, opportunities, matchScore? }
   Replace with agent response when backend is ready.
──────────────────────────────────────────────────────────────────────────── */
const USER_SKILLS = [
  { id: 'u1', name: 'Forklift Operation',   detail: 'You have demonstrated proficiency in operating forklifts in warehouse and manufacturing environments, including load handling, safety protocols, and equipment maintenance checks.', transferability: 'Forklift operation maps directly to logistics, distribution centers, and automated warehouse coordination. The spatial reasoning and load-management discipline you developed are highly portable.', opportunities: 'Supply Chain Coordinator, Warehouse Supervisor, Logistics Operations Lead', matchScore: 91 },
  { id: 'u2', name: 'Quality Control',       detail: 'Your experience includes inspecting products against specification sheets, logging defects, running statistical sampling, and interfacing with production teams to resolve non-conformances.', transferability: 'Quality Control translates strongly into manufacturing QA, regulatory compliance, and software QA. Attention to standards and documentation is universally valued.', opportunities: 'QA Engineer, Compliance Analyst, Process Auditor', matchScore: 87 },
  { id: 'u3', name: 'Assembly Line Mgmt',    detail: 'You have coordinated multi-person assembly workflows, managed line throughput targets, and identified bottlenecks to optimize production cycles.', transferability: 'Assembly line management underpins lean manufacturing, operations management, and production planning roles across advanced manufacturing sectors.', opportunities: 'Production Supervisor, Operations Manager, Manufacturing Engineer', matchScore: 84 },
  { id: 'u4', name: 'Inventory Management',  detail: 'You have tracked stock levels, performed cycle counts, managed reorder points, and worked with inventory management systems to maintain accurate records.', transferability: 'Inventory management is foundational to supply chain, procurement, and ERP-driven operations. The data discipline you built transfers well into analytics roles.', opportunities: 'Procurement Specialist, Supply Chain Analyst, ERP Coordinator', matchScore: 89 },
  { id: 'u5', name: 'CNC Operation',          detail: 'You are skilled in setting up, operating, and maintaining CNC machines including lathes and mills, reading G-code, and maintaining dimensional tolerances.', transferability: 'CNC operation is evolving into CNC programming and robotics integration. Your precision mindset and technical literacy are direct pathways into advanced manufacturing.', opportunities: 'CNC Programmer, Robotics Technician, Automation Specialist', matchScore: 78 },
  { id: 'u6', name: 'Safety Compliance',      detail: 'You have maintained OSHA compliance records, conducted safety briefings, investigated near-miss incidents, and implemented corrective action plans on the shop floor.', transferability: 'Safety compliance expertise is highly transferable to EHS management, regulatory affairs, and risk assessment roles across industries.', opportunities: 'EHS Coordinator, Safety Manager, Risk Analyst', matchScore: 82 },
  { id: 'u7', name: 'Team Leadership',        detail: 'You have led teams of 5–15 workers, handled shift handoffs, motivated performance, and served as escalation point for operational issues.', transferability: 'Team leadership is one of the most universally transferable skills. It applies to project management, operations leadership, and any people-facing role across sectors.', opportunities: 'Operations Team Lead, Project Coordinator, Training Supervisor', matchScore: 95 },
  { id: 'u8', name: 'Process Optimization',   detail: 'You have applied time-motion studies and basic lean tools (5S, Kaizen) to reduce cycle times and eliminate waste in production workflows.', transferability: 'Process optimization applies directly to industrial engineering, operational excellence, and continuous improvement roles across all industries.', opportunities: 'Industrial Engineer, Continuous Improvement Analyst, Lean Consultant', matchScore: 80 },
]

const SUGGESTED_SKILLS = [
  { id: 's1',  name: 'Supply Chain Ops',       detail: 'Supply Chain Operations covers end-to-end coordination of goods from source to delivery, including vendor management, logistics planning, and demand forecasting.', transferability: 'Your inventory management and forklift experience covers 68% of the hands-on competencies needed. The gap is primarily in vendor negotiation and ERP fluency.', opportunities: 'Take a free Supply Chain Fundamentals course on Coursera (3 weeks). Michigan Works! also offers sponsored training for this certification.', matchScore: 68 },
  { id: 's2',  name: 'Data Analytics',          detail: 'Data analytics involves collecting, cleaning, and interpreting operational data to support decision-making using tools like Excel, SQL, and Power BI.', transferability: 'Your quality control and inventory background already involves data collection and interpretation. Bridging to formal analytics mainly requires learning one visualization tool.', opportunities: 'Start with Microsoft Learn (free) for Power BI. Excel Advanced Formulas is also available free through LinkedIn Learning.', matchScore: 55 },
  { id: 's3',  name: 'Warehouse Mgmt Systems', detail: 'WMS platforms like SAP EWM and Oracle WMS digitize warehouse operations with real-time inventory visibility and automated pick/pack workflows.', transferability: 'You already understand the physical workflows these systems automate. WMS training is primarily interface-level and positions you for significantly higher-paying roles.', opportunities: 'Most WMS vendors offer free trials and tutorials. Michigan Works! partners offer employer-sponsored WMS certification programs.', matchScore: 76 },
  { id: 's4',  name: 'Lean Manufacturing',      detail: 'Lean Manufacturing is a systematic method for minimizing waste without sacrificing productivity. Core tools include Value Stream Mapping, 5S, Kaizen, and Kanban.', transferability: 'Your process optimization experience with 5S and Kaizen gives you a strong foundation. A formal certification formalizes and expands this into high-demand roles.', opportunities: 'Free Lean 101 course via Michigan Works!. Six Sigma Yellow Belt (8 hours online) is a strong first step toward certification.', matchScore: 72 },
  { id: 's5',  name: 'ERP Systems (SAP)',        detail: 'Enterprise Resource Planning systems integrate finance, HR, manufacturing, and supply chain data into a unified platform used by thousands of Michigan employers.', transferability: 'SAP training takes 3–6 months. Your operational background means you understand the business processes these systems support — a significant learning advantage.', opportunities: 'SAP offers free learning paths on SAP Learning Hub. Michigan community colleges offer affordable SAP Fundamentals courses.', matchScore: 60 },
  { id: 's6',  name: 'Project Management',       detail: 'Project management involves scoping, planning, executing, and closing work initiatives on time and within budget using frameworks like PMP, Agile, or PRINCE2.', transferability: 'Your team leadership and process optimization experience maps directly to project management competencies. A CAPM certification formalizes skills you already practice.', opportunities: 'PMI offers the CAPM exam for $225 (members). Free prep materials available on YouTube. Most Michigan manufacturers prefer PMP for senior roles.', matchScore: 83 },
  { id: 's7',  name: 'Technical Writing',        detail: 'Technical writing produces documentation — SOPs, work instructions, training guides, and safety manuals — that industrial operations depend on for consistency and compliance.', transferability: 'Your safety compliance and process roles required writing and maintaining SOPs. Formalizing this into technical writing broadens appeal to corporate quality and training teams.', opportunities: 'Google Technical Writing Fundamentals (free, 2 weeks). Society for Technical Communication (STC) offers a recognized certification path.', matchScore: 65 },
  { id: 's8',  name: 'Robotics Integration',     detail: 'Robotics integration involves programming, deploying, and maintaining industrial robots and collaborative robots (cobots) in manufacturing environments.', transferability: 'Your CNC background gives you the mechanical intuition and precision discipline that robotics integration requires. Robot programming (FANUC, Universal Robots) is the primary bridge.', opportunities: 'Universal Robots offers free online UR Academy training. FANUC offers sponsored training through Michigan community colleges.', matchScore: 58 },
  { id: 's9',  name: 'IoT Fundamentals',         detail: 'Industrial IoT connects machines, sensors, and software to provide real-time production data, predictive maintenance signals, and operational intelligence.', transferability: 'Your shop-floor experience gives you context for what IoT data means in practice — a huge advantage over purely technical learners.', opportunities: 'Coursera "IoT for Manufacturing" (4 weeks, free audit). Michigan State University offers an online IIoT certificate program.', matchScore: 50 },
  { id: 's10', name: 'Digital Manufacturing',    detail: 'Digital manufacturing integrates simulation, digital twins, and real-time data to optimize factory operations — a growing priority for Michigan automotive and defense manufacturers.', transferability: 'Your assembly line and process optimization experience is the experiential foundation. Digital manufacturing roles seek people who understand physical operations and can translate them digitally.', opportunities: 'Siemens and PTC both offer free introductory courses on digital twin technology. Michigan MEP offers subsidized training for manufacturers.', matchScore: 54 },
]

export default function ResultsPage() {
  const navigate  = useNavigate()
  const { theme } = useTheme()
  const dnaColor  = theme === 'dark' ? '#4d8fff' : '#1a6bff'

  return (
    <div className="results-root">

      {/* ── Top bar ── */}
      <div className="results-topbar">
        <SkilldnaLogo />
        <div className="results-topbar-right">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round">
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
          Click any <strong>Suggested Skill</strong> to explore details and learning pathways.
        </p>
      </div>

      {/* ── Neural Network Map ── */}
      <div className="results-map-section">
        <SkillNetworkMap
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
