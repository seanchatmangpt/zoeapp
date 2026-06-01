const fs = require('fs');

const overlayPath = '/Users/sac/pcp/src/framework/ui/TransitionOverlay.tsx';
let overlayContent = fs.readFileSync(overlayPath, 'utf8');

overlayContent = overlayContent.replace(
  `import { useSession } from '@/context/SessionProvider';\nimport { useColorScheme } from '@/src/components/useColorScheme';`,
  ``
);

overlayContent = overlayContent.replace(
  `export function TransitionOverlay() {\n  const { isTransitioning, transitionType } = useSession();\n  const colorScheme = useColorScheme();`,
  `export interface TransitionOverlayProps {\n  isTransitioning: boolean;\n  transitionType?: 'signin' | 'signout' | string | null;\n  colorScheme?: 'light' | 'dark' | null;\n}\n\nexport function TransitionOverlay({ isTransitioning, transitionType, colorScheme }: TransitionOverlayProps) {`
);

fs.writeFileSync(overlayPath, overlayContent);

const testPath = '/Users/sac/pcp/src/framework/ui/__tests__/TransitionOverlay.test.tsx';
let testContent = fs.readFileSync(testPath, 'utf8');

testContent = testContent.replace(
  `import { useSession } from '@/context/SessionProvider';\nimport { useColorScheme } from '../../../components/useColorScheme';\n\njest.mock('@/context/SessionProvider', () => ({\n  useSession: jest.fn(),\n}));\n\njest.mock('../../../components/useColorScheme', () => ({\n  useColorScheme: jest.fn(),\n}));`,
  ``
);

testContent = testContent.replace(
  `  it('renders nothing when not visible', () => {\n    (useSession as jest.Mock).mockReturnValue({ isTransitioning: false, transitionType: null });\n    (useColorScheme as jest.Mock).mockReturnValue('light');\n\n    const { toJSON } = render(<TransitionOverlay />);`,
  `  it('renders nothing when not visible', () => {\n    const { toJSON } = render(<TransitionOverlay isTransitioning={false} transitionType={null} colorScheme="light" />);`
);

testContent = testContent.replace(
  `  it('renders correctly when transitioning to signin in light mode', () => {\n    (useSession as jest.Mock).mockReturnValue({ isTransitioning: true, transitionType: 'signin' });\n    (useColorScheme as jest.Mock).mockReturnValue('light');\n\n    const { getByText } = render(<TransitionOverlay />);`,
  `  it('renders correctly when transitioning to signin in light mode', () => {\n    const { getByText } = render(<TransitionOverlay isTransitioning={true} transitionType="signin" colorScheme="light" />);`
);

testContent = testContent.replace(
  `  it('renders correctly when transitioning to signout in dark mode', () => {\n    (useSession as jest.Mock).mockReturnValue({ isTransitioning: true, transitionType: 'signout' });\n    (useColorScheme as jest.Mock).mockReturnValue('dark');\n\n    const { getByText } = render(<TransitionOverlay />);`,
  `  it('renders correctly when transitioning to signout in dark mode', () => {\n    const { getByText } = render(<TransitionOverlay isTransitioning={true} transitionType="signout" colorScheme="dark" />);`
);

testContent = testContent.replace(
  `  it('handles transition state change from true to false', () => {\n    (useSession as jest.Mock).mockReturnValue({ isTransitioning: true, transitionType: 'signin' });\n    (useColorScheme as jest.Mock).mockReturnValue('light');\n\n    const { getByText, rerender } = render(<TransitionOverlay />);\n    expect(getByText('Welcome back!')).toBeTruthy();\n\n    (useSession as jest.Mock).mockReturnValue({ isTransitioning: false, transitionType: 'signin' });\n    rerender(<TransitionOverlay />);`,
  `  it('handles transition state change from true to false', () => {\n    const { getByText, rerender } = render(<TransitionOverlay isTransitioning={true} transitionType="signin" colorScheme="light" />);\n    expect(getByText('Welcome back!')).toBeTruthy();\n\n    rerender(<TransitionOverlay isTransitioning={false} transitionType="signin" colorScheme="light" />);`
);

fs.writeFileSync(testPath, testContent);

console.log("Fixed TransitionOverlay");
