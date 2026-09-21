async function test() {
  const req = await fetch('http://localhost:3000/api/admin/accounts/user-1789386012885-k3pjro', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ninimo-tok-1d1add8e8586e875d9209574e96e02439ccfdbadc53531c7' }
  });
  console.log(req.status, await req.text());
}
test();
