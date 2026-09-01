
import dotenv from "dotenv";
dotenv.config();
// console.log(process.env.MONGODB_URI);
import mongoose from 'mongoose';
import user from './models/user_model.js';
// what is mongoose?
// Mongoose is an ODM (Object Data Modeling) library for MongoDB and Node.js.
// it helps to link the database with the application using schemas and models.
// it provides a schema-based solution to model the application data..
// | Feature            | **ORM (Object-Relational Mapping)**                 | **ODM (Object-Document Mapping)**           |
// | ------------------ | --------------------------------------------------- | ------------------------------------------- |
// | **Used For**       | SQL Databases (like MySQL, PostgreSQL)              | NoSQL Databases (like MongoDB)              |
// | **Data Model**     | Tables, Rows, Columns (Structured Schema)           | Collections, Documents (Flexible Schema)    |
// | **Examples**       | Sequelize, TypeORM, Hibernate                       | Mongoose (for MongoDB)                      |
// | **Mapping**        | Objects ↔ Tables/Rows                               | Objects ↔ Documents                         |
// | **Schema**         | Fixed schema (must define columns/types in advance) | Flexible schema (can vary across documents) |
// | **Query Language** | SQL                                                 | JSON-like queries (MongoDB query syntax)    |
// read 1 from backend.txt



async function connect() {
    // read id-2 
    mongoose.connect(process.env.MONGODB_URI)
        .then(async () => {
            console.log("Connected to MongoDB successfully");
            await user.syncIndexes();
        })
        .catch((err) => {
            console.error("Error connecting to MongoDB:", err);
        });
}
export default connect;