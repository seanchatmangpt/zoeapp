import { Stack } from '@/src/components/AvatarRelativeProjection';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.AvatarRelativeProjection name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
