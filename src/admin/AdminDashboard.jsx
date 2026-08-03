import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  LoaderCircle,
  Mail,
  PackageCheck,
  Users,
} from "lucide-react";
import { getInventorySummary, listAdminResource } from "../services/adminService";
import { asArray } from "../services/apiClient";
import styles from "./AdminApp.module.css";

const money = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

function countFrom(payload) {
  if (Number.isFinite(Number(payload?.count))) return Number(payload.count);
  return asArray(payload).length;
}

export default function AdminDashboard({ context, empresaSlug, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const company = context.empresa_actual;

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadDashboard() {
      const requests = [
        listAdminResource("/catalogo/productos/", empresaSlug, {
          paginar: true,
          page: 1,
          tamano_pagina: 1,
          incluir_inactivos: false,
        }),
        listAdminResource("/usuarios/administracion/", empresaSlug, {
          page: 1,
          tamano_pagina: 1,
          activo: true,
        }),
        listAdminResource("/pedidos/pedidos/", empresaSlug, {
          paginar: true,
          page: 1,
          tamano_pagina: 5,
          orden: "-fecha_creacion",
        }),
        listAdminResource("/contacto/mensajes/", empresaSlug, {
          paginar: true,
          page: 1,
          tamano_pagina: 5,
          estado: "nuevo",
          orden: "-fecha_creacion",
        }),
        company.permite_productos_fisicos
          ? getInventorySummary(empresaSlug)
          : Promise.resolve(null),
      ];

      const [products, users, orders, contacts, inventory] = await Promise.allSettled(requests);
      if (!active) return;
      setData({
        products: products.status === "fulfilled" ? products.value : null,
        users: users.status === "fulfilled" ? users.value : null,
        orders: orders.status === "fulfilled" ? orders.value : null,
        contacts: contacts.status === "fulfilled" ? contacts.value : null,
        inventory: inventory.status === "fulfilled" ? inventory.value : null,
      });
      setLoading(false);
    }

    loadDashboard();
    return () => { active = false; };
  }, [company.permite_productos_fisicos, empresaSlug]);

  if (loading) {
    return <div className={styles.fullPageLoading}><LoaderCircle className={styles.spin} size={25} /><strong>Preparando el resumen de la empresa</strong></div>;
  }

  const recentOrders = asArray(data?.orders);
  const pendingContacts = asArray(data?.contacts);
  const inventory = data?.inventory;

  return (
    <section className={styles.dashboardPage}>
      <header className={styles.dashboardHeader}>
        <div>
          <span className={styles.eyebrow}>Empresa activa</span>
          <h1>{company.nombre}</h1>
          <p>Catalogo, clientes y actividad comercial en una sola vista.</p>
        </div>
        <div className={styles.companyMode}>
          <span>Operacion</span>
          <strong>{company.modo_inventario_nombre}</strong>
        </div>
      </header>

      <div className={styles.metricStrip}>
        <button onClick={() => onNavigate("productos")} type="button">
          <PackageCheck size={20} />
          <span><small>Catalogo activo</small><strong>{countFrom(data?.products)}</strong></span>
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate("usuarios")} type="button">
          <Users size={20} />
          <span><small>Usuarios activos</small><strong>{countFrom(data?.users)}</strong></span>
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate("pedidos")} type="button">
          <ClipboardList size={20} />
          <span><small>Pedidos registrados</small><strong>{countFrom(data?.orders)}</strong></span>
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate("contactos")} type="button">
          <Mail size={20} />
          <span><small>Mensajes nuevos</small><strong>{countFrom(data?.contacts)}</strong></span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className={styles.dashboardGrid}>
        <section className={styles.dashboardBand}>
          <header><div><span>Ventas</span><h2>Pedidos recientes</h2></div><button onClick={() => onNavigate("pedidos")} type="button">Ver todos <ArrowRight size={15} /></button></header>
          {recentOrders.length ? (
            <div className={styles.activityList}>
              {recentOrders.map((order) => (
                <button key={order.id} onClick={() => onNavigate("pedidos")} type="button">
                  <span><strong>{order.numero}</strong><small>{order.usuario_nombre || "Cliente"}</small></span>
                  <span><strong>{money.format(Number(order.total) || 0)}</strong><small>{order.estado_pago}</small></span>
                </button>
              ))}
            </div>
          ) : <p className={styles.bandEmpty}>Aun no hay pedidos para mostrar.</p>}
        </section>

        <section className={styles.dashboardBand}>
          <header><div><span>Atencion</span><h2>Mensajes por revisar</h2></div><button onClick={() => onNavigate("contactos")} type="button">Abrir bandeja <ArrowRight size={15} /></button></header>
          {pendingContacts.length ? (
            <div className={styles.activityList}>
              {pendingContacts.map((message) => (
                <button key={message.id} onClick={() => onNavigate("contactos")} type="button">
                  <span><strong>{message.nombre}</strong><small>{message.asunto || "Sin asunto"}</small></span>
                  <span className={styles.newMarker}>Nuevo</span>
                </button>
              ))}
            </div>
          ) : <p className={styles.bandEmpty}>No hay mensajes nuevos.</p>}
        </section>
      </div>

      {inventory ? (
        <section className={styles.inventoryCallout}>
          <Boxes size={25} />
          <div><span>Inventario fisico</span><strong>{inventory.existencia_total} unidades disponibles</strong><small>Valor estimado {money.format(Number(inventory.valor_inventario) || 0)}</small></div>
          <div className={inventory.productos_agotados > 0 ? styles.inventoryAlert : ""}><AlertTriangle size={18} /><span><strong>{inventory.productos_agotados}</strong> agotados</span></div>
          <div className={inventory.productos_bajo_stock > 0 ? styles.inventoryAlert : ""}><AlertTriangle size={18} /><span><strong>{inventory.productos_bajo_stock}</strong> bajo stock</span></div>
          <button onClick={() => onNavigate("inventario")} type="button">Administrar <ArrowRight size={16} /></button>
        </section>
      ) : null}
    </section>
  );
}

