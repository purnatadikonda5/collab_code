const axios = require('axios');

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
    
    // Add missing dependencies to package.json
    if (fileTree['package.json']) {
      const pkg = JSON.parse(fileTree['package.json'].file.contents);
      pkg.dependencies = pkg.dependencies || {};
      pkg.dependencies.helmet = "^7.0.0";
      pkg.dependencies.morgan = "^1.10.0";
      fileTree['package.json'].file.contents = JSON.stringify(pkg, null, 2);
    }
    
    await axios.put(`http://localhost:3000/projects/update-filetree/${collabcode._id}`, { fileTree }, authHeaders);
    console.log("Database fileTree fixed with helmet and morgan!");

  } catch (err) {
    console.error("Error:", err);
  }
}
fix();
