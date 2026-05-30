import React from 'react';
import { Redirect } from 'expo-router';

export default function TabAdmin() {
  return <Redirect href={"/admin/actor-lab" as any} />;
}
