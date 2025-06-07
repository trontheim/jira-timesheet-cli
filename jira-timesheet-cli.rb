class JiraTimesheetCli < Formula
  desc "CLI tool to generate timesheets from Jira worklogs via REST API"
  homepage "https://github.com/trontheim/jira-timesheet-cli"
  version "1.0.0"
  license "MIT"

  # Platform-specific URLs for direct binary downloads
  on_macos do
    on_intel do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-darwin-x64"
      sha256 "6de44898079e300e76cbbe4cfd3aebdf69a047e223baef8b5b2e81d54ea9cfce"
    end
    
    on_arm do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-darwin-arm64"
      sha256 "6713b41e4caecb4caef7a329153ef02e2072e27a49465a211fb55692b6f7fb9c"
    end
  end
  
  on_linux do
    on_intel do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-linux-x64"
      sha256 "2fa5d80311bce8dee3df6a25f2391397cdddd5e24dc0cad6043a6b8d95d8b2e7"
    end
    
    on_arm do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-linux-arm64"
      sha256 "72db9d1d1025f69b658def4aaa70b260d20dc1348eab9ef84ee402721d9da3e3"
    end
  end
  
  # Windows support (for documentation - Homebrew doesn't run on Windows)
  # But useful for completeness and potential future WSL/Cygwin support
  on_system :windows do
    on_intel do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-win-x64.exe"
      sha256 "fd2a1027a71038ee3013f3ea8bc79f837b53c0256c046501e7f23217e5506af9"
    end
    
    on_arm do
      url "https://github.com/trontheim/jira-timesheet-cli/releases/download/v1.0.0/timesheet-win-arm64.exe"
      sha256 "6dbffa25122ebb9f0ed0959105a6c5fd236375624f549c21c62bc67f87501540"
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
