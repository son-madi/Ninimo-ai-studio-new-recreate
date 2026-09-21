async function test() {
  const req = await fetch('http://localhost:3000/api/admin/accounts', {
    headers: { 'Authorization': 'Bearer ninimo-tok-1d1add8e8586e875d9209574e96e02439ccfdbadc53531c7' }
  });
  console.log(await req.text());
}
test();
