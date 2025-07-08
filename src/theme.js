// Ant Design theme configuration
export const themeConfig = {
  token: {
    colorPrimary: '#696969',
    colorSuccess: '#000000',
    colorWarning: '#666666',
    colorError: '#ff4d4f',
    colorInfo: '#000000',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    borderRadius: 8,
    fontFamily: '"Crimson Text", serif',
  },
  components: {
    Button: {
      primaryShadow: 'none',
      fontWeight: 600,
    },
    Input: {
      borderRadius: 8,
      paddingBlock: 12,
      paddingInline: 16,
    },
    Typography: {
      fontFamily: '"Crimson Text", serif',
    },
  },
}
