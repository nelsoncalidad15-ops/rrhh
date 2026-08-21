import RRHHDashboard from './RRHHDashboard';

const GRADES_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=208474053&single=true&output=csv';
const RELATORIO_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=914584447&single=true&output=csv';
const CONTACTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=55715729&single=true&output=csv';
const PHASES_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=1692538205&single=true&output=csv';
const ESTANDAR_OPERACIONAL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR2x4kZurVkW4fVtQROHlRMB7v7i2osvf2-zazRo2RmluGi_7Y0mA46sAT85t5x_vd20ctEtKjtcJa/pub?gid=880320732&single=true&output=csv';
const CAREER_PLAN_URL = 'https://docs.google.com/spreadsheets/d/14v21bofu7z2oMfKsGQs2C-p6ZgVgvucqrom4zdobI3k/export?format=csv&gid=1373663936';

export default function RRHHDashboardContainer() {
  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-[#00B0F0]/10 selection:text-[#001E50]">
      <RRHHDashboard
        gradesUrl={GRADES_URL}
        relatorioUrl={RELATORIO_URL}
        contactsUrl={CONTACTS_URL}
        phasesUrl={PHASES_URL}
        estandarOperacionalUrl={ESTANDAR_OPERACIONAL_URL}
        careerPlanUrl={CAREER_PLAN_URL}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  );
}