import { Check } from "lucide-react";
import styles from "./PurchaseSteps.module.css";

const DELIVERY_STEPS = ["Carrito", "Entrega", "Pago"];
const PAYMENT_STEPS = ["Carrito", "Pago"];

function PurchaseSteps({ activeStep, hasDelivery }) {
  const steps = hasDelivery ? DELIVERY_STEPS : PAYMENT_STEPS;

  return (
    <ol className={styles.steps} aria-label="Progreso de compra">
      {steps.map((label, index) => {
        const step = index + 1;
        const isComplete = step < activeStep;
        const isActive = step === activeStep;

        return (
          <li
            className={`${styles.step} ${isComplete ? styles.complete : ""} ${
              isActive ? styles.active : ""
            }`}
            key={label}
            aria-current={isActive ? "step" : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {isComplete ? <Check size={16} strokeWidth={3} /> : step}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default PurchaseSteps;
