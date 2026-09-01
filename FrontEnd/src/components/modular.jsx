// ModalTrigger.jsx
import React from "react";

const ModalTrigger = ({ children, openModal }) => {
  return (
    <div
      onClick={openModal}
      role="button"
      tabIndex={0}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
};

export default ModalTrigger;
