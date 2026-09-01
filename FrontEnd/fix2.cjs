const axios = require('axios');
const fs = require('fs');

async function fix() {
  try {
    const loginRes = await axios.post('http://localhost:3000/users/login', {
      email: 'test@test.com',
      password: 'abcd'
    });
    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    
    const projectsRes = await axios.get('http://localhost:3000/projects/all', authHeaders);
    const collabcode = projectsRes.data.find(p => p.name === 'collab-code');
    
    const projRes = await axios.get(`http://localhost:3000/projects/get-project/${collabcode._id}`, authHeaders);
    const fileTree = projRes.data.fileTree;
    
    console.log("Keys:", Object.keys(fileTree));
    fs.writeFileSync('/Users/purna/Desktop/collab_code/scratch_fileTree2.json', JSON.stringify(fileTree, null, 2));

  } catch (err) {
    console.error("Error:", err);
  }
}
fix();
