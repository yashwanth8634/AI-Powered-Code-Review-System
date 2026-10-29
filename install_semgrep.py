import subprocess
import sys


def install_semgrep():
    try:
        subprocess.check_call([
            sys.executable,
            "-m",
            "pip",
            "install",
            "--user",
            "semgrep"
        ])

        print("Semgrep installed successfully.")

        subprocess.check_call([
            sys.executable,
            "-m",
            "semgrep",
            "--version"
        ])

    except subprocess.CalledProcessError as error:
        print(f"Semgrep installation failed: {error}")
        sys.exit(1)


if __name__ == "__main__":
    install_semgrep()
