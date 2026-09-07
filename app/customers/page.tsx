"use client";

import { FormEvent, useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function loadCustomers() {
    const response = await fetch(
      "/api/customers",
      { cache: "no-store" }
    );

    const data = await response.json();

    setCustomers(data.customers || []);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function addCustomer(
    event: FormEvent
  ) {
    event.preventDefault();

    const response = await fetch(
      "/api/customers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email
        })
      }
    );

    if (response.ok) {
      setName("");
      setEmail("");
      await loadCustomers();
    }
  }

  return (
    <main className="container">

      <div className="card">

        <h1>Customers</h1>

        <form onSubmit={addCustomer}>

          <label>Name</label>

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Customer name"
            required
          />

          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="customer@example.com"
            required
          />

          <button className="button primary">
            Add Customer
          </button>

        </form>

        <hr />

        <h2>
          {customers.length} customers
        </h2>

        {customers.map((customer) => (
          <div
            key={customer.id}
            className="customer-row"
          >
            <strong>
              {customer.name}
            </strong>

            <span>
              {customer.email}
            </span>
          </div>
        ))}

      </div>

    </main>
  );
}