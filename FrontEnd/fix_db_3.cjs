const axios = require('axios');
async function fix() {
  const loginRes = await axios.post('http://localhost:3000/users/login', { email: 'test@test.com', password: 'abcd' });
  const authHeaders = { headers: { Authorization: `Bearer ${loginRes.data.token}` } };
  const projectsRes = await axios.get('http://localhost:3000/projects/all', authHeaders);
  const collabcode = projectsRes.data.find(p => p.name === 'collab-code');
  const projRes = await axios.get(`http://localhost:3000/projects/get-project/${collabcode._id}`, authHeaders);
  const fileTree = projRes.data.fileTree;
  
  if (fileTree['middleware/errorHandler.js']) {
    fileTree['middleware/errorMiddleware.js'] = fileTree['middleware/errorHandler.js'];
    delete fileTree['middleware/errorHandler.js'];
  }
  
  fileTree['middleware/notFoundMiddleware.js'] = {
    file: {
      contents: "const notFoundHandler = (req, res, next) => { const error = new Error(`Not Found - ${req.originalUrl}`); res.status(404); next(error); }; module.exports = notFoundHandler;"
    }
  };
  
  await axios.put(`http://localhost:3000/projects/update-filetree/${collabcode._id}`, { fileTree }, authHeaders);
  console.log("Database fileTree fixed missing middleware files!");
}
fix();
