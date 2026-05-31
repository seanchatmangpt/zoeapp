# Semantic i18n Module (`i18n-semantic`)

The `i18n-semantic` module is a core component of the **Zoe 2030 Innovation Peak**. It moves beyond traditional, static string-lookup translation systems, treating internationalization as a dynamic, structural, and aesthetic transformation that adapts both the content and the layout of the user interface to suit the cultural expectations of a given locale.

---

## 1. Overview & Core Philosophy

In legacy architectures, internationalization (i18n) is treated merely as a dictionary replacement of text labels. The Zoe 2030 Peak redefines this by introducing **Semantic Translation 2.0**. Under this paradigm, every localized string is bound to a **Semantic Intent**, which encapsulates:
*   **Text content** with dynamic variable interpolation.
*   **Layout directionality** (LTR/RTL) that propagates dynamically up to layout containers.
*   **Cultural aesthetic preferences**, including typography configurations and spacing multipliers.
*   **Semantic iconography**, ensuring visual metaphors adapt appropriately (e.g., swapping directional icons or choosing culturally resonant indicators).

By tying localized content directly to layout and design specifications, the system dynamically restructures layout flows, adjusts paddings/margins, swaps icons, and updates font properties at runtime without requiring hardcoded, locale-specific logic inside UI components.

---

## 2. Architectural & Philosophical Mapping

The `i18n-semantic` module conforms strictly to the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
*   **$O^*$ (Lawful Closure Ontology)**: Represented by the **Cultural Resource Definition Framework (RDF)** schemas (`en-US.json`, `ar-SA.json`). These JSON-LD structures define the admissible states, global layout directions, aesthetic spacing matrices, and visual assets associated with a specific culture.
*   **$\mu$ (Manufacturing/Transformation Function)**: Represented by the **`SemanticTranslationEngine`** and React hooks (`useSemanticI18n`). This function takes abstract developer intent (e.g., requesting the key `auth.login`) and maps it against the ontology $O^*$ to produce localized layout instructions, styles, and values.
*   **$A$ (Emitted Consequence)**: The rendered React Native view layout. This includes flipped layout flows (`flexDirection: 'row-reverse'`), text alignment shifts, typography switches, and adjusted visual spacing.
*   **$R$ (Receipt Lineage)**: The deterministic validation layer (implemented in the test suites) confirming that layouts scale, flip, and style accurately according to metadata constraints, preventing layout breakage and ensuring visual accessibility.

---

## 3. Source Code Structure

The module is self-contained within `src/framework/2030/i18n-semantic/`:

```
i18n-semantic/
├── data/
│   ├── ar-SA.json                   # Cultural RDF mappings & aesthetics for Arabic (Saudi Arabia)
│   └── en-US.json                   # Cultural RDF mappings & aesthetics for English (United States)
├── index.ts                         # Public exports/entry point
├── types.ts                         # Type definitions for states, values, aesthetics, & RDF format
├── SemanticTranslationEngine.ts     # Core translation and variable interpolation logic
├── SemanticI18nContext.tsx          # React Context Provider and useSemanticI18n hook
├── SemanticLayout.tsx               # Adaptive React Native UI components (Text & Views)
├── SemanticTranslationEngine.test.ts # Unit tests verifying engine functionality
└── SemanticLayout.test.tsx          # Integration/UI tests verifying layout direction & rendering
```

---

## 4. Public Interfaces & API Contracts

### 4.1 Type Definitions (`types.ts`)

#### `LayoutOrientation`
Defines the bidirectional layout options.
```typescript
export type LayoutOrientation = 'ltr' | 'rtl';
```

#### `SemanticAesthetic`
Defines cultural aesthetics loaded dynamically per locale.
```typescript
export interface SemanticAesthetic {
  /** Cultural color significance */
  colorPalette?: Record<string, string>;
  /** Spacing adjustments for different scripts (e.g. 1.2x for Arabic) */
  spacingMultiplier?: number;
  /** Font family preferred for the culture */
  fontFamily?: string;
}
```

#### `SemanticIntent`
Combines textual data with layout instructions and visual cues.
```typescript
export interface SemanticIntent {
  /** The core message/intent key */
  intent: string;
  /** Translated text with replaced variables */
  text: string;
  /** Cultural-specific vector icon name */
  icon?: string;
  /** Layout direction override for this specific intent */
  layout?: LayoutOrientation;
  /** Extra metadata for custom UI interpretation */
  metadata?: Record<string, any>;
}
```

#### `CulturalRDF`
The structure for the JSON-LD schemas representing each language's ontology.
```typescript
export interface CulturalRDF {
  '@context'?: string;
  '@type'?: 'CulturalContext';
  culture: string;
  orientation: LayoutOrientation;
  aesthetic: SemanticAesthetic;
  mappings: Record<string, SemanticIntent>;
}
```

#### `SemanticI18nContextValue`
Exposed context API for hooks and wrappers.
```typescript
export interface SemanticI18nContextValue {
  culture: string;
  data: CulturalRDF | null;
  isLoading: boolean;
  error: string | null;
  translate: (key: string, variables?: Record<string, string>) => SemanticIntent;
  setCulture: (culture: string) => Promise<void>;
  getOrientation: () => LayoutOrientation;
}
```

---

### 4.2 Core Engine Class (`SemanticTranslationEngine`)

Manages internal configuration registry and mapping calculations.

*   `constructor(initialCulture?: string)`: Sets the default language/culture code (defaults to `'en-US'`).
*   `initialize(): Promise<void>`: Loads and parses the corresponding RDF file from the internal registry.
*   `setCulture(culture: string): Promise<void>`: Dynamically overrides the culture and re-initializes dataset mappings.
*   `translate(key: string, variables?: Record<string, string>): SemanticIntent`: Extracts raw text, executes regex interpolation (`{variableName}`), applies layout rules, and returns the unified `SemanticIntent`.
*   `getOrientation(): LayoutOrientation`: Returns the root layout directionality.
*   `getAesthetic(): SemanticAesthetic`: Returns the global spacing and font family definitions.

---

### 4.3 Context Provider & Hooks (`SemanticI18nContext.tsx`)

*   **`SemanticI18nProvider`**: Wrapping React component that boots up the translation engine and distributes the state to the tree.
*   **`useSemanticI18n()`**: Convenience hook to retrieve layout values and translate functions.

---

### 4.4 Adaptive Layout Components (`SemanticLayout.tsx`)

#### `<SemanticIntentView />`
A container component wrapping standard layout structures. It automatically switches `flexDirection` properties based on orientation.

*   **Props**:
    *   `intentKey: string` (The translation key)
    *   `variables?: Record<string, string>` (Dynamic string key/value pairs)
    *   `children?: (intent: SemanticIntent) => React.ReactNode` (Optional render prop function for fine-grained manual styling)
    *   `style?: StyleProp<ViewStyle>`
    *   Inherits all standard React Native `ViewProps` (e.g., `testID`, `onLayout`, etc.)

#### `<SemanticText />`
A text component that applies localized text alignments (`left` for LTR, `right` for RTL).

*   **Props**:
    *   `intentKey: string`
    *   `variables?: Record<string, string>`
    *   `style?: StyleProp<TextStyle>`
    *   Inherits all standard React Native `TextProps`

---

## 5. Usage Guide

The following TypeScript React Native example demonstrates how to wrap your application in the `SemanticI18nProvider`, use the adaptive components to handle English/Arabic toggling, and extract aesthetics manually for spacing adjustments.

```tsx
import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { 
  SemanticI18nProvider, 
  useSemanticI18n, 
  SemanticIntentView, 
  SemanticText 
} from '@/src/framework/2030/i18n-semantic';

/**
 * Screen demonstrating Semantic Translation and Cultural Adaptation
 */
function MainPortal() {
  const { culture, setCulture, getOrientation } = useSemanticI18n();

  const toggleLanguage = async () => {
    const nextCulture = culture === 'en-US' ? 'ar-SA' : 'en-US';
    await setCulture(nextCulture);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header with custom orientation awareness */}
      <View style={[
        styles.header, 
        { flexDirection: getOrientation() === 'rtl' ? 'row-reverse' : 'row' }
      ]}>
        <Text style={styles.headerTitle}>Zoe 2030 Portal</Text>
        
        <TouchableOpacity style={styles.toggleBtn} onPress={toggleLanguage}>
          <Text style={styles.btnText}>
            {culture === 'en-US' ? 'العربية (RTL)' : 'English (LTR)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Semantic Intent View containing automatically flipped layout & icons */}
      <SemanticIntentView 
        intentKey="auth.login" 
        style={styles.card}
      />

      {/* 3. Interpolation and render prop usage for custom text styling */}
      <SemanticIntentView 
        intentKey="welcome.message" 
        variables={{ name: 'Operator' }} 
        style={styles.welcomeCard}
      >
        {(intent) => (
          <View style={[
            styles.customMessageContainer,
            { flexDirection: intent.layout === 'rtl' ? 'row-reverse' : 'row' }
          ]}>
            <Text style={styles.emojiPrefix}>👋</Text>
            <Text style={[
              styles.welcomeText, 
              { textAlign: intent.layout === 'rtl' ? 'right' : 'left' }
            ]}>
              {intent.text}
            </Text>
          </View>
        )}
      </SemanticIntentView>

      {/* 4. Directly rendering semantic aligned text */}
      <SemanticText 
        intentKey="auth.signup" 
        style={styles.footerText} 
      />
    </View>
  );
}

export default function App() {
  return (
    <SemanticI18nProvider initialCulture="en-US">
      <MainPortal />
    </SemanticI18nProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d1d1f',
  },
  toggleBtn: {
    backgroundColor: '#0071e3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  welcomeCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  customMessageContainer: {
    alignItems: 'center',
  },
  emojiPrefix: {
    fontSize: 22,
    marginHorizontal: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#0d47a1',
    fontWeight: '500',
  },
  footerText: {
    fontSize: 14,
    color: '#86868b',
    marginTop: 10,
    width: '100%',
  },
});
```

---

## 6. Test Suite Specification

The module is verified using Jest and `@testing-library/react-native`. Tests ensure both unit logic and visual rendering contracts are preserved.

### 6.1 Unit Tests (`SemanticTranslationEngine.test.ts`)
*   **Initialization validation**: Asserts that defaults are properly configured for `en-US` (LTR layout).
*   **Simple Translation checks**: Tests key-to-intent lookups and validates layout value fallback attributes.
*   **Interpolation checks**: Validates regex-based replacement of `{bracketed}` string variables.
*   **Locale Swapping**: Verifies that re-setting culture updates the internal translation schemas and correctly turns orientations to `rtl`.
*   **Fallback protection**: Warns and returns key placeholders for invalid or unknown dictionary keys.
*   **Aesthetic Retrieval**: Asserts spacing offsets are loaded (e.g. English `1.0` vs Arabic `1.2`).

### 6.2 Component Tests (`SemanticLayout.test.tsx`)
*   **`<SemanticText />` alignment verification**: Validates that component styling inherits `textAlign: 'left'` for English and `textAlign: 'right'` for Arabic.
*   **`<SemanticIntentView />` layout flipping**: Verifies that the view component applies `flexDirection: 'row-reverse'` when rendering an Arabic key.
*   **Render Prop compliance**: Tests custom execution paths and content delivery through the children render callback function.

### 6.3 Running Tests
Run the test suite from the repository root:

```bash
npm test src/framework/2030/i18n-semantic
```
