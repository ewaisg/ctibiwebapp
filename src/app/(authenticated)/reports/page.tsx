import { ReportsClientPage } from './client-page';
import { adminDb } from '@/lib/firebase-admin';
import type { Department, Project, Contract } from '@/types';

async function getReportsData() {
  try {
    if (!adminDb) {
      return { departments: [], projects: [], contracts: [] };
    }

    const [departmentsSnapshot, projectsSnapshot, contractsSnapshot] = await Promise.all([
      adminDb.collection('departments').orderBy('departmentName').get(),
      adminDb.collection('projects').orderBy('projectName').get(),
      adminDb.collection('contracts').orderBy('contractNumber').get(),
    ]);

    const departments = departmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Department[];

    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const contracts = contractsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Contract[];

    return {
      departments: JSON.parse(JSON.stringify(departments)),
      projects: JSON.parse(JSON.stringify(projects)),
      contracts: JSON.parse(JSON.stringify(contracts)),
    };
  } catch (error) {
    console.error('Error fetching reports data:', error);
    return { departments: [], projects: [], contracts: [] };
  }
}

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <ReportsClientPage
      departments={data.departments}
      projects={data.projects}
      contracts={data.contracts}
    />
  );
}
