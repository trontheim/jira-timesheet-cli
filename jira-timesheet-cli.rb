class JiraTimesheetCli < Formula
  desc "CLI tool to generate timesheets from Jira worklogs via REST API"
  homepage "https://github.com/yourusername/jira-timesheet-cli"
  version "1.0.0"
  license "MIT"

  # Platform-specific URLs for direct binary downloads
  on_macos do
    on_intel do
      url "https://github.com/yourusername/jira-timesheet-cli/releases/download/v1.0.0/timesheet-darwin-amd64"
      sha256 "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    end
    
    on_arm do
      url "https://github.com/yourusername/jira-timesheet-cli/releases/download/v1.0.0/timesheet-darwin-arm64"
      sha256 "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    end
  end
  
  on_linux do
    on_intel do
      url "https://github.com/yourusername/jira-timesheet-cli/releases/download/v1.0.0/timesheet-linux-amd64"
      sha256 "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
    end
    
    on_arm do
      url "https://github.com/yourusername/jira-timesheet-cli/releases/download/v1.0.0/timesheet-linux-arm64"
      sha256 "567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234"
    end
  end
  
  # Windows support (for documentation - Homebrew doesn't run on Windows)
  # But useful for completeness and potential future WSL/Cygwin support
  on_system :windows do
    on_intel do
      url "https://github.com/yourusername/jira-timesheet-cli/releases/download/v1.0.0/timesheet-windows-amd64.exe"
      sha256 "111222333444555666777888999000aaabbbbccccddddeeeeffffgggghhhhiiii"
    end
    
    on_arm do
      url "https://github.com/yourusername/jira-timesheet-cli/releases/download/v1.0.0/timesheet-windows-arm64.exe"
      sha256 "aaabbbcccdddeeefffggghhhiiijjjkkklllmmmnnnooopppqqqrrrssstttuuuvvv"
    end
  end

  # Minimum OS requirements if needed
  on_macos do
    depends_on macos: :monterey
  end

  def install
    # Handle different file extensions per platform
    binary_name = case OS.kernel_name.downcase
                  when "darwin", "linux"
                    "timesheet-#{OS.kernel_name.downcase}-#{Hardware::CPU.arch}"
                  when "windows", "mingw32", "cygwin"
                    "timesheet-windows-#{Hardware::CPU.arch}.exe"
                  else
                    raise "Unsupported platform: #{OS.kernel_name}"
                  end
    
    # Install and rename the binary
    target_name = OS.windows? ? "timesheet.exe" : "timesheet"
    bin.install binary_name => target_name
    
    # Ensure the binary is executable (not needed on Windows but doesn't hurt)
    chmod 0755, bin/target_name unless OS.windows?
  end

  test do
    # Determine the correct binary name for testing
    binary_name = OS.windows? ? "timesheet.exe" : "timesheet"
    
    # Test that the CLI tool can be executed and shows help
    output = shell_output("#{bin}/#{binary_name} --help", 0)
    assert_match "CLI tool to generate timesheets", output
    
    # Test version command if available
    version_output = shell_output("#{bin}/#{binary_name} --version 2>&1", 0)
    assert_match version.to_s, version_output
    
    # Platform-specific tests
    on_macos do
      # Verify it's a Mach-O binary
      file_output = shell_output("file #{bin}/#{binary_name}")
      assert_match "Mach-O", file_output
    end
    
    on_linux do
      # Verify it's an ELF binary
      file_output = shell_output("file #{bin}/#{binary_name}")
      assert_match "ELF", file_output
    end
    
    # Note: Windows tests would go here if Homebrew supported Windows
    # on_windows do
    #   file_output = shell_output("file #{bin}/#{binary_name}")
    #   assert_match "PE32", file_output
    # end
  end
end
