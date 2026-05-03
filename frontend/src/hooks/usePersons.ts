"use client";
import { useState, useEffect, useCallback } from "react";
import { personsApi, Person } from "@/lib/api";

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await personsApi.list();
      setPersons(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (name: string) => {
    await personsApi.create(name);
    await refresh();
  };

  const update = async (id: string, name: string) => {
    await personsApi.update(id, name);
    await refresh();
  };

  const remove = async (id: string) => {
    await personsApi.delete(id);
    await refresh();
  };

  return { persons, loading, create, update, remove, refresh };
}
