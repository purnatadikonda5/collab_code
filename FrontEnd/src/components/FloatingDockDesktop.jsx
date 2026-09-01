import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TiHome } from "react-icons/ti";
import { GrProjects } from "react-icons/gr";
import {
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "../lib/utils";
import { Github, LogIn, UserPlus, FileText, Users } from "lucide-react";

const FloatingDockDesktop = ({ className, visibleItems = {} }) => {
  let mouseX = useMotionValue(Infinity);
  const navigate = useNavigate();

  const allItems = [
    {
      key: "login",
      title: "Login",
      icon: <LogIn />,
      path: "/login",
      isExternal: false,
    },
    {
      key: "signup",
      title: "Sign Up",
      icon: <UserPlus />,
      path: "/signup",
      isExternal: false,
    },
    {
      key: "home",
      title: "Home",
      icon: <TiHome size={32} />,
      path: "/",
      isExternal: false,
    },
    {
      key: "projects",
      title: "projects",
      icon: <GrProjects />,
      path: "/projects",
      isExternal: false,
    },
    {
      key: "docs",
      title: "Documentation",
      icon: <FileText />,       
      path: "/documentation",
      isExternal: false,
    },
    {
      key: "team",
      title: "Team",
      icon: <Users />,
      path: "/developers",
      isExternal: false,
    },
  ];

  // Filter items based on the `visibleItems` prop
  const filteredItems = allItems.filter((item) => visibleItems[item.key]);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 gap-4 items-end rounded-2xl bg-gray-900 px-4 pb-3 ",
        className
      )}
    >
      {filteredItems.map((item) => (
        <IconContainer 
          mouseX={mouseX} 
          key={item.title} 
          {...item} 
          navigate={navigate}
        />
      ))}
    </motion.div>
  );
};

function IconContainer({ mouseX, title, icon, path, isExternal, navigate }) {
  let ref = useRef(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  let heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 40, 20]
  );

  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const handleClick = (e) => {
    if (!isExternal) {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      className="aspect-square rounded-full bg-gray-700 flex items-center justify-center relative cursor-pointer"
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="px-2 py-0.5 whitespace-pre rounded-md bg-gray-800 border border-gray-600 text-white absolute left-1/2 -translate-x-1/2 -top-8 w-fit text-xs"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center text-gray-200"
      >
        {isExternal ? (
          <a 
            href={path} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {icon}
          </a>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            {icon}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default FloatingDockDesktop;
