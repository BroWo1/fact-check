# Coding Conventions

## Vue 3 Patterns

- **Composition API**: All components use `<script setup>` syntax
- **Reactive State**: Use `ref()` for primitives, `reactive()` for objects
- **Composables**: Extract reusable logic into `use*` functions
- **Props/Emits**: Define with TypeScript-style syntax in `<script setup>`

## Component Structure

```vue
<template>
  <!-- Template content -->
</template>

<script setup>
// Imports first
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

// Props and emits
const props = defineProps({
  // prop definitions
})

const emit = defineEmits(['event-name'])

// Composables
const { t } = useI18n()

// Reactive state
const isLoading = ref(false)
const data = reactive({})

// Methods
const handleAction = () => {
  // implementation
}
</script>

<style scoped>
/* Component-specific styles */
</style>
```

## Service Layer Patterns

- **Class-based Services**: Use ES6 classes for service modules
- **Axios Interceptors**: Implement response/request interceptors for error handling
- **Retry Logic**: Use exponential backoff for failed requests
- **Error Handling**: Consistent error propagation and logging

## State Management

- **No Global Store**: Use composables instead of Vuex/Pinia
- **Local Storage**: Persist session data using dedicated service
- **WebSocket + Polling**: Implement fallback communication patterns

## Styling Conventions

- **CSS Variables**: Use CSS custom properties for theming
- **Ant Design**: Primary UI component library with custom theme
- **Scoped Styles**: Component-specific styles in `<style scoped>`
- **Font Loading**: Custom fonts loaded via CSS `@font-face`

## Error Handling

- **Service Layer**: Catch and transform API errors
- **Component Layer**: Display user-friendly error messages
- **Retry Logic**: Implement automatic retry with backoff
- **Logging**: Console logging for debugging (development)

## Internationalization

- **Vue I18n**: Use `useI18n()` composable in components
- **Translation Keys**: Nested object structure in locale files
- **Dynamic Content**: Support for parameterized translations
- **Fallback**: English as default language

## File Organization

- **Single Responsibility**: One main export per file
- **Barrel Exports**: Use index files for clean imports
- **Relative Imports**: Same directory, absolute for cross-directory
- **Asset Organization**: Separate fonts, images, and styles