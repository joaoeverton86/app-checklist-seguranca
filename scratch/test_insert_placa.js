const url = 'https://qqtcwxvbjmybyzubocgd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdGN3eHZiam15Ynl6dWJvY2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODczNDUsImV4cCI6MjEwMDE2MzM0NX0.T6Nm-lUD2I_mRULsEXCDQBkJe2cEpl6_z7hUNR30yTk';

async function test() {
    try {
        const testObj = {
            id: 'TEST-PLACA-999',
            tipo: 'veiculos',
            categoria: 'veiculos_leves',
            nome: 'TEST VEHICLE',
            patrimonio: 'TEST-PLACA-999',
            placa: 'XYZ-9999', // Test if this column exists
            empresa: 'TEST',
            ativo: true
        };
        
        const res = await fetch(`${url}/rest/v1/cadastros`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(testObj)
        });
        
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text}`);
        
        // Clean up if it succeeded
        if (res.ok) {
            await fetch(`${url}/rest/v1/cadastros?id=eq.TEST-PLACA-999`, {
                method: 'DELETE',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                }
            });
            console.log('Cleaned up test record.');
        }
    } catch (e) {
        console.error(e);
    }
}

test();
