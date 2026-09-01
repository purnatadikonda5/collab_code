"use client";
import React, { useState } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
  useModal
} from "../createfoldermodal/animated-modal.jsx";
import { GlowButton, ChevronIcon } from "../createfoldermodal/glow-button.jsx";
import { Input } from "../../components/Input.jsx";
import { Label } from "../../components/Label.jsx";
import { motion } from "framer-motion";

export function ProjectFormModal() {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const { closeModal } = useModal();
  
  const handleSubmit = () => {
    // This function will be implemented by you
    console.log("Project created:", { projectName, projectDescription });
    // Reset form
    setProjectName("");
    setProjectDescription("");
    closeModal();
  };
  
  const handleCancel = () => {
    // Reset form
    setProjectName("");
    setProjectDescription("");
    closeModal();
  };
  
  return (
    <div className="py-40 flex items-center justify-center font-serif">
      <Modal>
        <ModalTrigger>
          <GlowButton>
            <span>Create Project</span>
            <ChevronIcon />
          </GlowButton>
        </ModalTrigger>
        
        <ModalBody>
          <ModalContent>
            <h4 className="text-lg md:text-2xl text-neutral-600 dark:text-neutral-100 font-bold text-center mb-8">
              Create a New{" "}
              <span className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700 border border-gray-200">
                Project
              </span>{" "}
              ✨
            </h4>
            
            <form className="space-y-6 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input 
                  id="projectName"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="projectDescription">Project Description</Label>
                <motion.div
                  style={{
                    background: "radial-gradient(circle at var(--x) var(--y), var(--blue-500, rgb(59, 130, 246)), transparent 80%)"
                  }}
                  className="p-[2px] rounded-lg transition duration-300 group/textarea"
                  whileHover={{
                    "--x": "var(--mouse-x)",
                    "--y": "var(--mouse-y)",
                  }}
                >
                  <textarea
                    id="projectDescription"
                    placeholder="Describe your project"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="flex w-full min-h-24 border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm placeholder:text-neutral-400 dark:placeholder-text-neutral-600 focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition duration-400"
                    required
                  />
                </motion.div>
              </div>
              
              <div className="flex justify-center pt-4">
                <motion.div
                  className="relative inline-block"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 opacity-70 blur-md"></span>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="relative bg-slate-800 text-white py-2 px-6 rounded-lg font-medium"
                  >
                    Create Project
                  </button>
                </motion.div>
              </div>
            </form>
          </ModalContent>
          
          <ModalFooter className="gap-4">
            <GlowButton onClick={handleCancel}>
              <span>Cancel</span>
            </GlowButton>
            
            <GlowButton onClick={handleSubmit}>
              <span>Submit</span>
              <ChevronIcon />
            </GlowButton>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </div>
  );
}