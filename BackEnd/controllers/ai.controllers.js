import * as ai from '../services/ai.services.js';

export const getResult = async(req,res)=>{
    try {
        // console.log(req.query);
        const {prompt}= req.query;
        let result = await ai.generateResult(prompt);
        res.send(result);
    } catch (error) {
        res.status(500).json({message :error.message})
    }   
}