import { findAllCases } from './src/models/fcuModels/casesModel';

async function checkAllUserImages() {
  try {
    const cases = await findAllCases();
    console.log('CASES COUNT:', cases.length);
    for (const c of cases) {
      console.log('CASE ID:', c.id, 'LEAD:', c.leadId, 'REF:', c.ref, 'USER_ID:', c.userId, 'DOCS COUNT:', c.docs.length);
      console.log('DOCS:', JSON.stringify(c.docs, null, 2));
    }
  } catch (err: any) {
    console.error(err);
  }
  process.exit(0);
}

checkAllUserImages();
