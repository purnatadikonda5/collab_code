import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FloatingDockDesktop from "../FloatingDockDesktop";
import axios from "../../config/axios.js";
import { ProjectFormModal } from "@/modals/createfoldermodal/ProjectFormModal";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
  useModal,
} from "../../modals/createfoldermodal/animated-modal.jsx";
import {
  GlowButton,
  ChevronIcon,
} from "../../modals/createfoldermodal/glow-button";
import { useNavigate } from "react-router-dom";

export const HoverEffect = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get("/projects/all");
      console.log("Fetched projects:", res.data);
      setProjects(res.data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchprojectdata = async (id) => {
    try {
      const res = await axios.get(`/projects/get-project/${id}`);
      // console.log("the response : ", res);
      return res.data;
    } catch (err) {
      console.error("Error fetching project data:", err);
      return null;
    }
  };

  const handleProjectClick = async (id) => {
    try {
      const projectData = await fetchprojectdata(id);
      // console.log("the project data is ", projectData);
      navigate("/editor", { state: { projectdata: projectData } });
    } catch (err) {
      console.error("Error navigating to project:", err);
    }
  };

  return (
    <div className="bg-[#02162A] select-none min-h-screen p-10 relative font-serif">
      {/* Top left project creation button */}
      <div className="absolute top-15 left-20 z-30">
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

              <ProjectFormContent fetchProjects={fetchProjects} />
            </ModalContent>

            <ModalFooter className="gap-4">
              <CancelButton />
              {/* Removed the SubmitButton since we're handling submission in the form */}
            </ModalFooter>
          </ModalBody>
        </Modal>
      </div>

      <FloatingDockDesktop
        visibleItems={{
          home: true,
        }}
        className={`fixed top-15 left-[95%] -translate-x-1/2`}
      />

      <div
        className={`grid grid-cols-1 md:grid-cols-2 pt-30 lg:grid-cols-6 py-10 mt-14`}
      >
        {projects?.map((item, idx) => (
          <a
            onClick={() => handleProjectClick(item._id)}
            key={item._id}
            className="relative group block p-2 h-full w-full cursor-pointer"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {hoveredIndex === idx && (
                <motion.span
                  className="absolute inset-0 h-full w-full bg-gray-500 dark:bg-slate-800/[0.8] block rounded-3xl"
                  layoutId="hoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15 } }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.2 },
                  }}
                />
              )}
            </AnimatePresence>
            <Card>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
};

// Form content component
const ProjectFormContent = ({ fetchProjects }) => {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const { closeModal } = useModal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (projectName === "" || projectDescription === "") {
      alert("Project name and description are required");
      return; // Don't close modal if validation fails
    }

    try {
      const res = await axios.post("/projects/create", {
        name: projectName,
        description: projectDescription,
      });
      console.log("Project created:", res.data);

      // Refresh the project list after creation
      await fetchProjects();

      // Reset form and close modal
      setProjectName("");
      setProjectDescription("");
      closeModal();
    } catch (err) {
      console.error("Error creating project:", err);
      alert("Error creating project. Please try again.");
    }
  };

  return (
    <form className="space-y-6 max-w-md mx-auto">
      <div className="space-y-2">
        <label
          htmlFor="projectName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Project Name
        </label>
        <input
          id="projectName"
          placeholder="Enter project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="flex w-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-sm rounded-md px-3 py-2 text-sm placeholder:text-neutral-400 dark:placeholder-text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="projectDescription"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Project Description
        </label>
        <motion.div
          style={{
            background:
              "radial-gradient(circle at var(--x) var(--y), var(--blue-500, rgb(59, 130, 246)), transparent 80%)",
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
            className="flex w-full min-h-24 border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm placeholder:text-neutral-400 dark:placeholder-text-neutral-600 focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition duration-400 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
  );
};

// Cancel button component
const CancelButton = () => {
  const { closeModal } = useModal();

  return (
    <GlowButton onClick={closeModal}>
      <span>Cancel</span>
    </GlowButton>
  );
};

export const Card = ({ className, children }) => {
  return (
    <div
      className={`rounded-2xl h-full w-full p-4 overflow-hidden bg-gray-600 border border-transparent dark:border-white/[0.2] group-hover:border-slate-700 relative z-20 ${className}`}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export const CardTitle = ({ className, children }) => {
  return (
    <h4 className={`text-white font-bold tracking-wide mt-4 ${className}`}>
      {children}
    </h4>
  );
};

export const CardDescription = ({ className, children }) => {
  return (
    <p
      className={`mt-8 text-white tracking-wide leading-relaxed text-sm ${className}`}
    >
      {children}
    </p>
  );
};
