class JiraTimesheetCli < Formula
  desc "CLI tool to generate timesheets from Jira worklogs via REST API"
  homepage "https://github.com/trontheim/jira-timesheet-cli"
  version "1.0.0"
  license "MIT"

  # Platform-specific URLs for direct binary downloads
  on_macos do
    on_intel do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-darwin-x64"
      sha256 "967297c14cfcd34631c0502bb6f97db3ef357b6318a2ded281f12ceccc2eb507"
    end
    
    on_arm do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-darwin-arm64"
      sha256 "c1aab07c8ca0ba22a61dc8444e7a910fd1747ce9a4f77d18ad7877a4e2ce78fd"
    end
  end
  
  on_linux do
    on_intel do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-linux-x64"
      sha256 "8c1f8ec95440172fefe4a4c4ad947fd86d5da62081ce6143558057af425962a8"
    end
    
    on_arm do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-linux-arm64"
      sha256 "4679a5aeecbcf332a2cae36deba94a327fba3c14f4d806c13286e4dabdfab18a"
    end
  end
  
  # Windows support (for documentation - Homebrew doesn't run on Windows)
  # But useful for completeness and potential future WSL/Cygwin support
  on_system :windows do
    on_intel do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-win-x64.exe"
      sha256 "409c79c45921fbaddb0f6ce6c905392ec001d7a329a98dcce57a77d195862a41"
    end
    
    on_arm do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-win-arm64.exe"
      sha256 "cb57d57e08211b1a04a2f5b0268c1a79495483d41a997919ca9d5ef9cc625d37"
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
