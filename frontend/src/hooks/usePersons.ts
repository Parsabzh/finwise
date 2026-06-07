"use client";
import { useState, useEffect, useCallback } from "react";
import { getPersons, createPerson, updatePerson, deletePerson, Person } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function usePersons() {
  const { token } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) { setPersons([]); setLoading(false); return; }
    try {
      const data = await getPersons(token);
      setPersons(data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (name: string) => {
    await createPerson(token ?? "", name);
    await refresh();
  };

  const update = async (id: string, name: string) => {
    await updatePerson(token ?? "", id, name);
    await refresh();
  };

  const remove = async (id: string) => {
    await deletePerson(token ?? "", id);
    await refresh();
  };

  return { persons, loading, create, update, remove, refresh };
}
