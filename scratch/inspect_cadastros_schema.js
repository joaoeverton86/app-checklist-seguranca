const url = 'https://qqtcwxvbjmybyzubocgd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdGN3eHZiam15Ynl6dWJvY2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODczNDUsImV4cCI6MjEwMDE2MzM0NX0.T6Nm-lUD2I_mRULsEXCDQBkJe2cEpl6_z7hUNR30yTk';

async function test() {
    try {
        const res = await fetch(`${url}/rest/v1/`, {
            headers: { 'apikey': key }
        });
        const text = await res.text();
        console.log(text);
    } catch (e) {
        console.error(e);
    }
}

test();
